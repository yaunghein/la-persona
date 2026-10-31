import { and, asc, desc, eq } from 'drizzle-orm';
import type { H3Event } from 'h3';
import { db } from '~~/server/db';
import { countCountedRegistrations } from '~~/server/features/event/registration.repository';
import { card, event as eventTable, member, user } from '~~/server/db/schema';
import { sendEmail } from '~~/server/lib/mailer';
import { env } from '~~/env';
import { renderQrTicketPng } from '~~/server/lib/qr-ticket-renderer';
import {
  cardContactInfoUrl,
  firstName,
  loadEventEmailContent,
  publicCardUrl,
  qrTicketImageUrl,
} from '~~/server/features/event/event-email-content';
import {
  emailErrorLabel,
  enrichLog,
  trackEmailSends,
  type EmailSendResult,
} from '~~/server/utils/wide-event';
import { ROUTES } from '~~/shared/utils/routes';

const TEMPLATE = 'event_registration';
const OWNER_TEMPLATE = 'event_registration_owner';

type EventRegistrationEmailParams = {
  userId: string;
  organization: { id: string; name: string; slug: string };
  event: { id: string; title: string };
  /** Only `registered` gets the attendee QR email; `pending` waits for approval. */
  status: 'registered' | 'pending';
  notifyOwner: boolean;
};

async function buildEventRegistrationEmail(
  params: EventRegistrationEmailParams
) {
  const [account, communityCard, content] = await Promise.all([
    db.query.user.findFirst({
      where: eq(user.id, params.userId),
      columns: { name: true, email: true },
    }),
    db
      .select({ slug: card.slug, firstName: card.firstName })
      .from(card)
      .where(
        and(
          eq(card.userId, params.userId),
          eq(card.organizationId, params.organization.id)
        )
      )
      .orderBy(desc(card.createdAt))
      .limit(1)
      .then((rows) => rows[0]),
    loadEventEmailContent({
      eventId: params.event.id,
      organizationId: params.organization.id,
    }),
  ]);

  if (!account?.email || !communityCard || !content) return null;

  return {
    to: account.email,
    cardSlug: communityCard.slug,
    qrBackgroundUrl: content.images.qrBackgroundUrl,
    props: {
      ...content.details,
      recipientName: firstName(communityCard.firstName, account.name),
      eventTitle: params.event.title,
      qrImageUrl: qrTicketImageUrl(communityCard.slug, content.images.version),
      contactInfoUrl: cardContactInfoUrl(
        params.organization.slug,
        communityCard.slug
      ),
    },
  };
}

async function sendAttendeeEmail(
  email: NonNullable<Awaited<ReturnType<typeof buildEventRegistrationEmail>>>
): Promise<EmailSendResult> {
  const to = [email.to];
  try {
    const [html, qrPng] = await Promise.all([
      renderEmailComponent('EventRegistration', email.props),
      renderQrTicketPng(
        publicCardUrl(email.cardSlug),
        email.qrBackgroundUrl || undefined
      ),
    ]);
    await sendEmail({
      to,
      subject: `You're registered for ${email.props.eventTitle}`,
      html,
      attachments: [{ filename: `${email.cardSlug}-qr.png`, content: qrPng }],
    });
    return { ok: true, template: TEMPLATE, to };
  } catch (error) {
    return { ok: false, template: TEMPLATE, to, error: emailErrorLabel(error) };
  }
}

async function buildOwnerEmail(params: EventRegistrationEmailParams) {
  const [owner, attendee, eventRow, registeredCount] = await Promise.all([
    db
      .select({ id: user.id, name: user.name, email: user.email })
      .from(member)
      .innerJoin(user, eq(user.id, member.userId))
      .where(
        and(
          eq(member.organizationId, params.organization.id),
          eq(member.role, 'admin')
        )
      )
      .orderBy(asc(member.createdAt))
      .limit(1)
      .then((rows) => rows[0]),
    db.query.user.findFirst({
      where: eq(user.id, params.userId),
      columns: { name: true, email: true },
    }),
    db.query.event.findFirst({
      where: eq(eventTable.id, params.event.id),
      columns: { capacity: true },
    }),
    countCountedRegistrations(params.event.id),
  ]);

  // Owners registering for their own event don't need to hear about it.
  if (!owner?.email || owner.id === params.userId || !attendee?.email) {
    return null;
  }

  return {
    to: owner.email,
    props: {
      ownerName: owner.name?.split(' ')[0] || 'there',
      attendeeName: attendee.name || attendee.email,
      attendeeEmail: attendee.email,
      eventTitle: params.event.title,
      pending: params.status === 'pending',
      registeredCount,
      capacity: eventRow?.capacity ?? null,
      attendeesUrl: `${env.BASE_URL}${ROUTES.EVENTS.PLATFORM(
        params.organization.slug,
        params.event.id
      )}`,
    },
  };
}

async function sendOwnerEmail(
  email: NonNullable<Awaited<ReturnType<typeof buildOwnerEmail>>>
): Promise<EmailSendResult> {
  const to = [email.to];
  try {
    const html = await renderEmailComponent(
      'EventRegistrationOwner',
      email.props
    );
    await sendEmail({
      to,
      subject: email.props.pending
        ? `${email.props.attendeeName} is waiting for approval to join ${email.props.eventTitle}`
        : `${email.props.attendeeName} registered for ${email.props.eventTitle}`,
      html,
    });
    return { ok: true, template: OWNER_TEMPLATE, to };
  } catch (error) {
    return {
      ok: false,
      template: OWNER_TEMPLATE,
      to,
      error: emailErrorLabel(error),
    };
  }
}

/** Attendee QR email when registered, plus the community owner's heads-up. */
export async function sendEventRegistrationEmails(
  event: H3Event,
  params: EventRegistrationEmailParams
) {
  const [attendeeEmail, ownerEmail] = await Promise.all([
    params.status === 'registered' ? buildEventRegistrationEmail(params) : null,
    params.notifyOwner ? buildOwnerEmail(params) : null,
  ]);

  const sends: Promise<EmailSendResult>[] = [];
  if (attendeeEmail) sends.push(sendAttendeeEmail(attendeeEmail));
  if (ownerEmail) sends.push(sendOwnerEmail(ownerEmail));

  enrichLog(event, {
    email: {
      attempted: sends.length > 0,
      to: [attendeeEmail?.to, ownerEmail?.to].filter(Boolean),
      // No community card means no QR to send.
      ...(params.status === 'registered' && !attendeeEmail
        ? { skipped: `${TEMPLATE}:no_card` }
        : {}),
    },
  });
  if (sends.length > 0) trackEmailSends(event, Promise.all(sends));
}
