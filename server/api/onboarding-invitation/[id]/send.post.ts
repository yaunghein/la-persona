import { eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import { onboardingInvitation } from '~~/server/db/schema';
import { requireAdminSession } from '~~/server/utils/admin-permissions';
import { sendOnboardingInvitationEmail } from '~~/server/services/onboarding-invitation';

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);

  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Invitation id is required' });
  }

  const invite = await db.query.onboardingInvitation.findFirst({
    where: eq(onboardingInvitation.id, id),
  });
  if (!invite) {
    throw createError({ statusCode: 404, statusMessage: 'Invitation not found' });
  }
  if (invite.status !== 'pending') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Only pending invitations can be sent',
    });
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + invite.expirationMinutes * 60 * 1000);

  await sendOnboardingInvitationEmail({
    invitationId: invite.id,
    email: invite.email,
  });

  const [updated] = await db
    .update(onboardingInvitation)
    .set({
      expiresAt,
      lastSentAt: now,
      resendCount: invite.resendCount + 1,
      updatedAt: now,
    })
    .where(eq(onboardingInvitation.id, invite.id))
    .returning();
  if (!updated) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update invitation send status',
    });
  }

  return updated;
});
