import { authorizeEventAccess } from '~~/server/features/event/event.policy';
import { cancelOwnRegistration } from '~~/server/features/event/event.service';
import { EventRouteParams } from '~~/shared/contracts/event';

/** The caller withdraws their registration (no-op if not registered). */
export default defineEventHandler(async (event) => {
  const { eventId } = await parseRouteParams(event, EventRouteParams);
  const { record, principal } = await authorizeEventAccess(
    event,
    eventId,
    'event:read'
  );
  const removed = await cancelOwnRegistration(record, principal.user.id);
  enrichLog(event, {
    registration: {
      event_id: eventId,
      registration_id: removed?.id,
      result: removed ? 'unregistered' : 'not_registered',
    },
  });
  return respondNoContent(event);
});
