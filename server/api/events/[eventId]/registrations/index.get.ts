import { authorizeEventAccess } from '~~/server/features/event/event.policy';
import { listAttendees } from '~~/server/features/event/event.service';
import { EventRouteParams } from '~~/shared/contracts/event';

/** Attendees (registrations) for organizers and check-in volunteers. */
export default defineEventHandler(async (event) => {
  const { eventId } = await parseRouteParams(event, EventRouteParams);
  const { record } = await authorizeEventAccess(event, eventId, 'checkIn:read');
  return listAttendees(record);
});
