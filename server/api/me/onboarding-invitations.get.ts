import { getPendingOnboardingInvitationByEmail } from '~~/server/features/onboarding/onboarding-invitation.service';
import { ListMyOnboardingInvitationsQuery } from '~~/shared/contracts/onboarding';

/** Pending card invitations addressed to the caller's email. */
export default defineEventHandler(async (event) => {
  const principal = requirePrincipal(event);
  await parseRequestQuery(event, ListMyOnboardingInvitationsQuery);
  const pending = await getPendingOnboardingInvitationByEmail(
    principal.user.email
  );
  return { items: pending ? [{ id: pending.id }] : [] };
});
