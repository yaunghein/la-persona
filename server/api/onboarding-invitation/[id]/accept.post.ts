import { auth } from '~~/server/auth';
import { acceptOnboardingInvitation } from '~~/server/services/onboarding-invitation';

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers });
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Invitation id is required' });
  }

  const accepted = await acceptOnboardingInvitation({
    invitationId: id,
    userId: session.user.id,
    userEmail: session.user.email,
    sessionId: session.session.id,
  });

  return accepted;
});
