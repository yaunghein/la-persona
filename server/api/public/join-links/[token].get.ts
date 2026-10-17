import { previewJoinLink } from '~~/server/features/organization/community.service';
import { JoinLinkRouteParams } from '~~/shared/contracts/organization';

/** Powers the join page for signed-out visitors and link previews. */
export default defineEventHandler(async (event) => {
  const { token } = await parseRouteParams(event, JoinLinkRouteParams);
  return previewJoinLink(token, findPrincipal(event)?.user.id ?? null);
});
