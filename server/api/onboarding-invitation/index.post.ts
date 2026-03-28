import { z } from 'zod';
import { requireAdminSession } from '~~/server/utils/admin-permissions';
import {
  createOnboardingInvitation,
  sendOnboardingInvitationEmail,
  buildOnboardingInvitationLink,
} from '~~/server/services/onboarding-invitation';

const createOnboardingInvitationSchema = z.object({
  email: z.string().trim().email(),
  organizationName: z.string().trim().min(2),
  cardId: z.string().min(1),
  subscriptionPlanCode: z.string().min(1),
  freeMonths: z.coerce.number().int().min(0),
  expirationMinutes: z.coerce.number().int().min(1),
  sendNow: z.coerce.boolean().optional().default(false),
});

export default defineEventHandler(async (event) => {
  const session = await requireAdminSession(event);

  const result = await readValidatedBody(
    event,
    createOnboardingInvitationSchema.safeParse
  );
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation failed',
      data: result.error.issues,
    });
  }

  const created = await createOnboardingInvitation({
    ...result.data,
    createdByUserId: session.user.id,
  });

  if (result.data.sendNow) {
    await sendOnboardingInvitationEmail({
      invitationId: created.id,
      email: created.email,
    });
  }

  return {
    ...created,
    link: buildOnboardingInvitationLink(created.id),
  };
});
