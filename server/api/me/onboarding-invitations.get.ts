import { getLatestPendingOnboardingInvitationByEmail } from '~~/server/features/onboarding/onboarding-invitation.service';
import { ListMyOnboardingInvitationsQuery } from '~~/shared/contracts/onboarding';

/** Latest pending card invitation for the caller, including one that has expired. */
export default defineEventHandler(async (event) => {
  const principal = requirePrincipal(event);
  await parseRequestQuery(event, ListMyOnboardingInvitationsQuery);
  const pending = await getLatestPendingOnboardingInvitationByEmail(
    principal.user.email
  );
  if (pending) enrichLog(event, { invitation: { id: pending.id } });
  return { items: pending ? [{ id: pending.id }] : [] };
});
