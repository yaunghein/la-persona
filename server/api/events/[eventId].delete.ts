import { authorizeEventAccess } from '~~/server/features/event/event.policy';
import { deleteEventByIdAndOrganizationId } from '~~/server/features/event/event.repository';
import { EventRouteParams } from '~~/shared/contracts/event';

export default defineEventHandler(async (event) => {
  const { eventId } = await parseRouteParams(event, EventRouteParams);
  const { record } = await authorizeEventAccess(event, eventId, 'event:delete');
  await deleteEventByIdAndOrganizationId(record.id, record.organizationId);
  return respondNoContent(event);
});
