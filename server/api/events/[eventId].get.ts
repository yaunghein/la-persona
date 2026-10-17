import { authorizeEventAccess } from '~~/server/features/event/event.policy';
import { describeEvent } from '~~/server/features/event/event.service';
import { EventRouteParams } from '~~/shared/contracts/event';

export default defineEventHandler(async (event) => {
  const { eventId } = await parseRouteParams(event, EventRouteParams);
  const { record, principal } = await authorizeEventAccess(
    event,
    eventId,
    'event:read'
  );
  return describeEvent(record, principal.user.id, requestTimezoneOffset(event));
});
