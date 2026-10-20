import { eq } from 'drizzle-orm';
import type { H3Event } from 'h3';
import { db } from '~~/server/db';
import { user } from '~~/server/db/schema';
import {
  communityContactsUrl,
  firstName,
  formatEventDateTime,
  loadEventEmailContent,
  publicCardUrl,
} from '~~/server/features/event/event-email-content';
import { sendEmail } from '~~/server/lib/mailer';
import { renderQrTicketPng } from '~~/server/lib/qr-ticket-renderer';
import {
  emailErrorLabel,
  enrichLog,
  trackEmailSends,
  type EmailSendResult,
} from '~~/server/utils/wide-event';

const TEMPLATE = 'event_check_in';

/** Confirmation to the attendee right after their first check-in. */
export async function sendEventCheckInEmail(
  h3Event: H3Event,
  params: {
    userId: string;
    cardSlug: string;
    cardFirstName: string | null;
    event: { id: string; title: string };
    organization: { id: string; slug: string };
    checkedInAt: Date;
  }
) {
  const [account, content] = await Promise.all([
    db.query.user.findFirst({
      where: eq(user.id, params.userId),
      columns: { name: true, email: true },
    }),
    loadEventEmailContent({
      eventId: params.event.id,
      organizationId: params.organization.id,
    }),
  ]);
  if (!account?.email || !content) return;

  const to = [account.email];
  enrichLog(h3Event, { email: { attempted: true, template: TEMPLATE, to } });

  trackEmailSends(
    h3Event,
    (async (): Promise<EmailSendResult[]> => {
      try {
        const [html, qrPng] = await Promise.all([
          renderEmailComponent('EventCheckIn', {
            recipientName: firstName(params.cardFirstName, account.name),
            eventTitle: params.event.title,
            checkedInAt: formatEventDateTime(
              params.checkedInAt,
              content.timeZone
            ),
            contactExchangeImageUrl: content.images.contactExchangeUrl,
            contactsUrl: communityContactsUrl(params.organization.slug),
            assetBaseUrl: content.details.assetBaseUrl,
          }),
          renderQrTicketPng(
            publicCardUrl(params.cardSlug),
            content.images.qrBackgroundUrl || undefined
          ),
        ]);
        await sendEmail({
          to,
          subject: `You're checked in to ${params.event.title}`,
          html,
          attachments: [
            { filename: `${params.cardSlug}-qr.png`, content: qrPng },
          ],
        });
        return [{ ok: true, template: TEMPLATE, to }];
      } catch (error) {
        return [
          { ok: false, template: TEMPLATE, to, error: emailErrorLabel(error) },
        ];
      }
    })()
  );
}
