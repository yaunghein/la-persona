import { authorizeEventAccess } from '~~/server/features/event/event.policy';
import { registerWalkIn } from '~~/server/features/event/event.service';
import { EventRouteParams } from '~~/shared/contracts/event';

/** The caller registers from the walk-in page (idempotent). */
export default defineEventHandler(async (event) => {
  const { eventId } = await parseRouteParams(event, EventRouteParams);
  const { record, organization, principal } = await authorizeEventAccess(
    event,
    eventId,
    'event:read'
  );

  const { registration, created } = await registerWalkIn(event, {
    record,
    organization,
    userId: principal.user.id,
  });
  enrichLog(event, {
    registration: {
      event_id: eventId,
      registration_id: registration.id,
      source: 'walk_in',
      result: created ? registration.status : 'already_registered',
    },
  });
  return created
    ? respondCreated(
        event,
        `/api/registrations/${registration.id}`,
        registration
      )
    : registration;
});
