import { and, eq, inArray } from 'drizzle-orm';
import type { H3Event } from 'h3';
import { db } from '~~/server/db';
import {
  card,
  event as eventTable,
  eventRegistration,
  user,
} from '~~/server/db/schema';
import {
  cardContactInfoUrl,
  communityContactsUrl,
  firstName,
  loadEventEmailContent,
  publicCardUrl,
  qrTicketImageUrl,
  type EventEmailContent,
} from '~~/server/features/event/event-email-content';
import { sendBatchEmails, sendEmail } from '~~/server/lib/mailer';
import { renderQrTicketPng } from '~~/server/lib/qr-ticket-renderer';
import {
  emailErrorLabel,
  enrichLog,
  trackEmailSends,
  type EmailSendResult,
} from '~~/server/utils/wide-event';
import type {
  EventBroadcastKind,
  EventRegistrationStatus,
} from '~~/shared/contracts/event';

const BROADCASTS: Record<
  EventBroadcastKind,
  {
    template: 'EventReminder' | 'EventAfterEvent';
    logTemplate: string;
    statuses: EventRegistrationStatus[];
    sentAtColumn: 'reminderEmailSentAt' | 'afterEventEmailSentAt';
    subject: (eventTitle: string) => string;
  }
> = {
  reminder: {
    template: 'EventReminder',
    logTemplate: 'event_reminder',
    statuses: ['registered', 'checked_in'],
    sentAtColumn: 'reminderEmailSentAt',
    subject: (title) => `Reminder: ${title} is coming up`,
  },
  after_event: {
    template: 'EventAfterEvent',
    logTemplate: 'event_after_event',
    statuses: ['checked_in'],
    sentAtColumn: 'afterEventEmailSentAt',
    subject: (title) => `Thank you for being part of ${title}`,
  },
};

// Resend's default limit is 2 requests/second; reminders go one by one to carry the QR.
const SINGLE_SEND_INTERVAL_MS = 600;

type Recipient = {
  email: string;
  name: string | null;
  cardSlug: string | null;
  cardFirstName: string | null;
};

function listRecipients(params: {
  eventId: string;
  organizationId: string;
  statuses: EventRegistrationStatus[];
}): Promise<Recipient[]> {
  return db
    .select({
      email: user.email,
      name: user.name,
      cardSlug: card.slug,
      cardFirstName: card.firstName,
    })
    .from(eventRegistration)
    .innerJoin(user, eq(user.id, eventRegistration.userId))
    .leftJoin(
      card,
      and(
        eq(card.userId, eventRegistration.userId),
        eq(card.organizationId, params.organizationId)
      )
    )
    .where(
      and(
        eq(eventRegistration.eventId, params.eventId),
        inArray(eventRegistration.status, params.statuses)
      )
    );
}

function buildProps(
  kind: EventBroadcastKind,
  recipient: Recipient,
  content: EventEmailContent,
  params: { eventTitle: string; orgSlug: string }
) {
  const shared = {
    recipientName: firstName(recipient.cardFirstName, recipient.name),
    eventTitle: params.eventTitle,
    assetBaseUrl: content.details.assetBaseUrl,
  };

  if (kind === 'after_event') {
    return {
      ...shared,
      afterEventImageUrl: content.images.afterEventUrl,
      contactsUrl: communityContactsUrl(params.orgSlug),
    };
  }

  // Reminder recipients without a card are filtered out before this.
  const cardSlug = recipient.cardSlug!;
  return {
    ...content.details,
    ...shared,
    qrImageUrl: qrTicketImageUrl(cardSlug, content.images.version),
    contactExchangeImageUrl: content.images.contactExchangeUrl,
    contactInfoUrl: cardContactInfoUrl(params.orgSlug, cardSlug),
  };
}

/** Reminders carry each attendee's QR as an attachment, which batch sends can't. */
async function sendRemindersWithQr(
  sendable: Recipient[],
  content: EventEmailContent,
  params: { subject: string; eventTitle: string; orgSlug: string }
): Promise<EmailSendResult[]> {
  const results: EmailSendResult[] = [];
  for (const [index, recipient] of sendable.entries()) {
    if (index > 0) {
      await new Promise((resolve) =>
        setTimeout(resolve, SINGLE_SEND_INTERVAL_MS)
      );
    }
    const to = [recipient.email];
    const cardSlug = recipient.cardSlug!;
    try {
      const [html, qrPng] = await Promise.all([
        renderEmailComponent(
          BROADCASTS.reminder.template,
          buildProps('reminder', recipient, content, params)
        ),
        renderQrTicketPng(
          publicCardUrl(cardSlug),
          content.images.qrBackgroundUrl || undefined
        ),
      ]);
      await sendEmail({
        to,
        subject: params.subject,
        html,
        attachments: [{ filename: `${cardSlug}-qr.png`, content: qrPng }],
      });
      results.push({ ok: true, template: BROADCASTS.reminder.logTemplate, to });
    } catch (error) {
      results.push({
        ok: false,
        template: BROADCASTS.reminder.logTemplate,
        to,
        error: emailErrorLabel(error),
      });
    }
  }
  return results;
}

/**
 * Sends one email per attendee (never CC: each carries their own name and QR).
 * Rendering and sending finish after the response; failures are logged per
 * batch on the request's wide event.
 */
export async function sendEventBroadcastEmail(
  h3Event: H3Event,
  params: {
    kind: EventBroadcastKind;
    event: { id: string; title: string };
    organization: { id: string; slug: string };
  }
) {
  const config = BROADCASTS[params.kind];
  const [content, recipients] = await Promise.all([
    loadEventEmailContent({
      eventId: params.event.id,
      organizationId: params.organization.id,
    }),
    listRecipients({
      eventId: params.event.id,
      organizationId: params.organization.id,
      statuses: config.statuses,
    }),
  ]);
  if (!content) {
    throw createError({ statusCode: 404, statusMessage: 'Event not found' });
  }

  // Reminders need the attendee's card for their QR ticket.
  const sendable = recipients.filter(
    (recipient) => params.kind === 'after_event' || Boolean(recipient.cardSlug)
  );
  const skipped = recipients.length - sendable.length;

  enrichLog(h3Event, {
    broadcast: {
      kind: params.kind,
      event_id: params.event.id,
      recipient_count: sendable.length,
      skipped_no_card: skipped,
    },
  });

  if (sendable.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage:
        params.kind === 'reminder'
          ? 'No registered attendees to email'
          : 'No checked-in attendees to email',
    });
  }

  const sentAt = new Date();
  await db
    .update(eventTable)
    .set({ [config.sentAtColumn]: sentAt })
    .where(eq(eventTable.id, params.event.id));

  const to = sendable.map((recipient) => recipient.email);
  enrichLog(h3Event, { email: { attempted: true, to } });

  const subject = config.subject(params.event.title);
  trackEmailSends(
    h3Event,
    (async (): Promise<EmailSendResult[]> => {
      try {
        if (params.kind === 'reminder') {
          return await sendRemindersWithQr(sendable, content, {
            subject,
            eventTitle: params.event.title,
            orgSlug: params.organization.slug,
          });
        }
        const emails = await Promise.all(
          sendable.map(async (recipient) => ({
            to: recipient.email,
            subject,
            html: await renderEmailComponent(
              config.template,
              buildProps(params.kind, recipient, content, {
                eventTitle: params.event.title,
                orgSlug: params.organization.slug,
              })
            ),
          }))
        );
        const chunks = await sendBatchEmails(emails);
        return chunks.map((chunk) => ({
          ok: !chunk.error,
          template: config.logTemplate,
          to: chunk.to,
          ...(chunk.error ? { error: emailErrorLabel(chunk.error) } : {}),
        }));
      } catch (error) {
        return [
          {
            ok: false,
            template: config.logTemplate,
            to,
            error: emailErrorLabel(error),
          },
        ];
      }
    })()
  );

  return {
    recipientCount: sendable.length,
    skipped,
    sentAt: sentAt.toISOString(),
  };
}
