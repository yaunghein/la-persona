import { and, desc, eq } from 'drizzle-orm';
import type { H3Event } from 'h3';
import { db } from '~~/server/db';
import { card, user } from '~~/server/db/schema';
import { sendEmail } from '~~/server/utils/email';
import { env } from '~~/server/utils/env';
import {
  emailErrorLabel,
  enrichLog,
  trackEmailSends,
  type EmailSendResult,
} from '~~/server/utils/wide-event';
import { ROUTES } from '~~/shared/utils/routes';

const TEMPLATE = 'event_registration';

type EventRegistrationEmailParams = {
  userId: string;
  organization: { id: string; name: string; slug: string };
  event: { id: string; title: string };
};

async function buildEventRegistrationEmail(
  params: EventRegistrationEmailParams
) {
  const [account, communityCard] = await Promise.all([
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
  ]);

  if (!account?.email) return null;

  const platformUrl = `${env.BASE_URL}${ROUTES.PLATFORM.ROOT}/${params.organization.slug}`;
  const wallpaperUrl = communityCard
    ? `${env.BASE_URL}${ROUTES.COMMUNITY_SETUP.CARD(
        params.organization.slug,
        communityCard.slug,
        { step: 'download-wallpaper', eventId: params.event.id }
      )}`
    : platformUrl;

  return {
    to: account.email,
    props: {
      recipientName:
        communityCard?.firstName || account.name?.split(' ')[0] || 'there',
      eventTitle: params.event.title,
      organizationName: params.organization.name,
      wallpaperUrl,
      platformUrl,
    },
  };
}

async function sendEventRegistrationEmail(
  email: NonNullable<Awaited<ReturnType<typeof buildEventRegistrationEmail>>>
): Promise<EmailSendResult> {
  const to = [email.to];
  try {
    const html = await renderEmailComponent('EventRegistration', email.props);
    await sendEmail({
      to,
      subject: `You're registered for ${email.props.eventTitle}`,
      html,
    });
    return { ok: true, template: TEMPLATE, to };
  } catch (error) {
    return { ok: false, template: TEMPLATE, to, error: emailErrorLabel(error) };
  }
}

export async function queueEventRegistrationEmail(
  event: H3Event,
  params: EventRegistrationEmailParams
) {
  const email = await buildEventRegistrationEmail(params);
  if (!email) return;

  enrichLog(event, { email: { attempted: true, to: [email.to] } });
  trackEmailSends(
    event,
    sendEventRegistrationEmail(email).then((result) => [result])
  );
}
