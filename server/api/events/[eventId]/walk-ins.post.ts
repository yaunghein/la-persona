import { authorizeEventAccess } from '~~/server/features/event/event.policy';
import { createWalkInRegistration } from '~~/server/features/event/event.service';
import {
  CreateWalkInRequest,
  EventRouteParams,
} from '~~/shared/contracts/event';

/** Staff register and check in a walk-in who has no email. */
export default defineEventHandler(async (event) => {
  const { eventId } = await parseRouteParams(event, EventRouteParams);
  const { record, principal } = await authorizeEventAccess(
    event,
    eventId,
    'checkIn:create'
  );
  const request = await parseRequestBody(event, CreateWalkInRequest);

  const registration = await createWalkInRegistration({
    record,
    createdByUserId: principal.user.id,
    request,
  });
  enrichLog(event, {
    registration: {
      event_id: eventId,
      registration_id: registration.id,
      result: 'walk_in',
    },
  });
  return respondCreated(
    event,
    `/api/registrations/${registration.id}`,
    registration
  );
});
