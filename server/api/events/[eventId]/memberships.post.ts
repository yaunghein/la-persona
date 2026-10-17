import { joinEventCommunity } from '~~/server/features/event/event.service';
import { EventRouteParams } from '~~/shared/contracts/event';

/** Joins the community hosting this event, from the public event page. */
export default defineEventHandler(async (event) => {
  const { eventId } = await parseRouteParams(event, EventRouteParams);
  const principal = requirePrincipal(event);
  const { organizationId, ...result } = await joinEventCommunity(
    eventId,
    principal.user.id
  );
  enrichLog(event, {
    organization_id: organizationId,
    event: {
      id: eventId,
      already_member: result.alreadyMember,
      card_slug: result.cardSlug,
    },
  });
  return result.alreadyMember
    ? result
    : respondCreated(event, `/api/me/organizations`, result);
});
