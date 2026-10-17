import { authorizeEventAccess } from '~~/server/features/event/event.policy';
import { deleteEvent } from '~~/server/features/event/event.service';
import { EventRouteParams } from '~~/shared/contracts/event';

export default defineEventHandler(async (event) => {
  const { eventId } = await parseRouteParams(event, EventRouteParams);
  const { record } = await authorizeEventAccess(event, eventId, 'event:delete');
  await deleteEvent(record);
  return respondNoContent(event);
});
