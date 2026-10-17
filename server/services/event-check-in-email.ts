import { eq } from 'drizzle-orm';
import type { H3Event } from 'h3';
import { db } from '~~/server/db';
import { user } from '~~/server/db/schema';
import {
  communityContactsUrl,
  firstName,
  formatYangonDateTime,
  loadEventEmailContent,
} from '~~/server/services/event-email-content';
import { sendEmail } from '~~/server/lib/mailer';
import {
  emailErrorLabel,
  enrichLog,
  trackEmailSends,
  type EmailSendResult,
} from '~~/server/utils/wide-event';

const TEMPLATE = 'event_check_in';

/** Confirmation to the attendee right after their first check-in. */
export async function queueEventCheckInEmail(
  h3Event: H3Event,
  params: {
    userId: string;
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
        const html = await renderEmailComponent('EventCheckIn', {
          recipientName: firstName(params.cardFirstName, account.name),
          eventTitle: params.event.title,
          checkedInAt: formatYangonDateTime(params.checkedInAt),
          contactExchangeImageUrl: content.images.contactExchangeUrl,
          contactsUrl: communityContactsUrl(params.organization.slug),
          assetBaseUrl: content.details.assetBaseUrl,
        });
        await sendEmail({
          to,
          subject: `You're checked in to ${params.event.title}`,
          html,
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
