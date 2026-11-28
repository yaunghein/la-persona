import { env } from '~~/env';
import { authorizeEventAccess } from '~~/server/features/event/event.policy';
import { addEventToGoogleCalendar } from '~~/server/features/event/event.service';
import { EventRouteParams } from '~~/shared/contracts/event';

export default defineEventHandler(async (event) => {
  if (!env.GOOGLE_CALENDAR_ENABLED) throw notFound();
  const { eventId } = await parseRouteParams(event, EventRouteParams);
  const { record, organization, principal } = await authorizeEventAccess(
    event,
    eventId,
    'event:read'
  );
  return addEventToGoogleCalendar(event, {
    record,
    organization,
    userId: principal.user.id,
  });
});
