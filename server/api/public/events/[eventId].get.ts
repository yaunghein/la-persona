import { describePublicEvent } from '~~/server/features/event/event.service';
import { EventRouteParams } from '~~/shared/contracts/event';

/** Public event page; signed-in visitors also get their membership and registration. */
export default defineEventHandler(async (event) => {
  const { eventId } = await parseRouteParams(event, EventRouteParams);
  return describePublicEvent(eventId, findPrincipal(event)?.user.id ?? null);
});
