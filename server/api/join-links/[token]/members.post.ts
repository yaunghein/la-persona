import { joinCommunityWithLink } from '~~/server/features/organization/community.service';
import { JoinLinkRouteParams } from '~~/shared/contracts/organization';

/** Joins the community behind a live join link (idempotent for members). */
export default defineEventHandler(async (event) => {
  const { token } = await parseRouteParams(event, JoinLinkRouteParams);
  const principal = requirePrincipal(event);
  const result = await joinCommunityWithLink(token, principal.user.id);
  enrichLog(event, {
    organization_id: result.organizationId,
    membership: { result: result.alreadyMember ? 'already_member' : 'joined' },
  });
  const body = {
    organizationSlug: result.organizationSlug,
    redirectTo: result.redirectTo,
  };
  return result.alreadyMember
    ? body
    : respondCreated(event, result.redirectTo, body);
});
