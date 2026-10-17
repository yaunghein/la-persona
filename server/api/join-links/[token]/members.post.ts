import { joinCommunityWithLink } from '~~/server/features/organization/community.service';
import { JoinLinkRouteParams } from '~~/shared/contracts/organization';

/** Joins the community behind a live join link (idempotent for members). */
export default defineEventHandler(async (event) => {
  const { token } = await parseRouteParams(event, JoinLinkRouteParams);
  const principal = requirePrincipal(event);
  const result = await joinCommunityWithLink(token, principal.user.id);
  enrichLog(event, {
    organization_id: result.organizationId,
    membership: { result: 'joined' },
  });
  return respondCreated(event, result.redirectTo, {
    organizationSlug: result.organizationSlug,
    redirectTo: result.redirectTo,
  });
});
