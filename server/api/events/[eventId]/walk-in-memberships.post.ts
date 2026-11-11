import { joinWalkInCommunity } from '~~/server/features/event/event.service';
import { EventRouteParams } from '~~/shared/contracts/event';

/** Joins the community from the walk-in page, during the check-in window. */
export default defineEventHandler(async (event) => {
  const { eventId } = await parseRouteParams(event, EventRouteParams);
  const principal = requirePrincipal(event);
  const { organizationId, ...result } = await joinWalkInCommunity(
    eventId,
    principal.user.id
  );
  enrichLog(event, {
    organization_id: organizationId,
    event: {
      id: eventId,
      source: 'walk_in',
      already_member: result.alreadyMember,
      card_slug: result.cardSlug,
    },
  });
  return result.alreadyMember
    ? result
    : respondCreated(event, `/api/me/organizations`, result);
});
