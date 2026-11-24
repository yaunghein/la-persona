import { authorizeCardAccess } from '~~/server/features/card/card.policy';
import { resendCompanyCardInvite } from '~~/server/features/organization/company.service';
import { CardRouteParams } from '~~/shared/contracts/card';
import { ORGANIZATION_TYPES } from '~~/shared/utils/constants';

export default defineEventHandler(async (event) => {
  const { cardSlug } = await parseRouteParams(event, CardRouteParams);
  const access = await authorizeCardAccess(
    event,
    cardSlug,
    'invitation:create'
  );
  if (access.card.organization.type !== ORGANIZATION_TYPES.COMPANY) {
    throw notFound('Card');
  }
  const { invitationId, email } = await resendCompanyCardInvite(
    access.card.card.id
  );
  enrichLog(event, {
    invitation: { id: invitationId },
    email: { attempted: true, to: email.to },
  });
  trackEmailSends(event, Promise.resolve([email]));
  return { ok: email.ok };
});
