import { auth } from '~~/server/auth';
import { getPendingOnboardingInvitationByEmail } from '~~/server/services/onboarding-invitation';

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers });
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  const pending = await getPendingOnboardingInvitationByEmail(
    session.user.email
  );

  return pending ? { id: pending.id } : null;
});
