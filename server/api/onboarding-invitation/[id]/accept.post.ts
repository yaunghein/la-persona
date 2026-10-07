import { auth } from '~~/server/auth';
import { acceptOnboardingInvitation } from '~~/server/services/onboarding-invitation';
import { eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import { onboardingInvitation } from '~~/server/db/schema';
import { enrichLog } from '~~/server/utils/wide-event';

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers });
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invitation id is required',
    });
  }

  const invite = await db.query.onboardingInvitation.findFirst({
    where: eq(onboardingInvitation.id, id),
    columns: { organizationId: true, email: true },
  });
  enrichLog(event, {
    invitation: {
      id,
      ...(invite?.organizationId
        ? { organization_id: invite.organizationId }
        : {}),
      email: invite?.email || session.user.email,
    },
  });

  const accepted = await acceptOnboardingInvitation({
    invitationId: id,
    userId: session.user.id,
    userEmail: session.user.email,
    sessionId: session.session.id,
  });

  return accepted;
});
