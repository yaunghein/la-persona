import { authorizeEventAccess } from '~~/server/features/event/event.policy';
import { broadcastToAttendees } from '~~/server/features/event/event.service';
import {
  CreateBroadcastRequest,
  EventRouteParams,
} from '~~/shared/contracts/event';

/** Emails every attendee (reminder / after-event); sending continues after the response. */
export default defineEventHandler(async (event) => {
  const { eventId } = await parseRouteParams(event, EventRouteParams);
  const { record, organization } = await authorizeEventAccess(
    event,
    eventId,
    'event:update'
  );
  const { kind } = await parseRequestBody(event, CreateBroadcastRequest);
  const result = await broadcastToAttendees(event, {
    record,
    organization,
    kind,
  });
  return respondAccepted(event, result);
});
