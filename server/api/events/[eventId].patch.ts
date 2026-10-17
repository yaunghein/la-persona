import { authorizeEventAccess } from '~~/server/features/event/event.policy';
import { updateEvent } from '~~/server/features/event/event.service';
import {
  EventRouteParams,
  UpdateEventRequest,
} from '~~/shared/contracts/event';

export default defineEventHandler(async (event) => {
  const { eventId } = await parseRouteParams(event, EventRouteParams);
  const { record } = await authorizeEventAccess(event, eventId, 'event:update');
  const request = await parseRequestBody(event, UpdateEventRequest);
  const updated = await updateEvent(record, request);
  enrichLog(event, { event: { title: updated.title } });
  return updated;
});
