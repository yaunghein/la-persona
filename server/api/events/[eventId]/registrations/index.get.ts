import { authorizeEventAccess } from '~~/server/features/event/event.policy';
import {
  exportAttendeesCsv,
  listAttendees,
} from '~~/server/features/event/event.service';
import {
  AttendeeExportQuery,
  EventRouteParams,
} from '~~/shared/contracts/event';

/**
 * JSON list for organizers and check-in volunteers.
 * CSV is organizers only (`event:update`); volunteers can see the list and still be refused the file.
 */
export default defineEventHandler(async (event) => {
  const { eventId } = await parseRouteParams(event, EventRouteParams);
  const access = await authorizeEventAccess(event, eventId, 'checkIn:read');
  if (!prefersCsv(event)) return listAttendees(access.record);

  if (!canAccessOrganization(access, 'event:update')) throw forbidden();
  const { roster } = await parseRequestQuery(event, AttendeeExportQuery);
  const { csv, rows } = await exportAttendeesCsv(access.record, roster);
  enrichLog(event, {
    export: {
      kind: roster === 'checked_in' ? 'check_ins' : 'attendees',
      rows,
    },
  });
  const fileName =
    roster === 'checked_in'
      ? `check-ins-${eventId}.csv`
      : `attendees-${eventId}.csv`;
  return respondCsv(event, fileName, csv);
});
