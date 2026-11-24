import { assignVacantCompanyCard } from '~~/server/features/organization/company.service';
import { authorizeCardAccess } from '~~/server/features/card/card.policy';
import { AssignCompanyCardRequest } from '~~/shared/contracts/company';
import { CardRouteParams } from '~~/shared/contracts/card';
import { ORGANIZATION_TYPES } from '~~/shared/utils/constants';

export default defineEventHandler(async (event) => {
  const { cardSlug } = await parseRouteParams(event, CardRouteParams);
  const access = await authorizeCardAccess(event, cardSlug, 'member:create');
  if (access.card.organization.type !== ORGANIZATION_TYPES.COMPANY) {
    throw notFound('Card');
  }
  const request = await parseRequestBody(event, AssignCompanyCardRequest);
  const assigned = await assignVacantCompanyCard({
    cardId: access.card.card.id,
    organizationId: access.card.card.organizationId,
    inviterId: access.principal.user.id,
    organizationName: access.card.organization.name,
    request,
  });
  enrichLog(event, {
    card: { id: access.card.card.id, new_slug: assigned.slug },
    invitation: { id: assigned.invitationId, email: request.email },
    email: { attempted: true, to: [request.email] },
  });
  trackEmailSends(event, Promise.resolve([assigned.email]));
  return {
    slug: assigned.slug,
    invitationId: assigned.invitationId,
    emailSent: assigned.email.ok,
  };
});
