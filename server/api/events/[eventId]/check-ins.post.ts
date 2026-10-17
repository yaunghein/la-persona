import { authorizeEventAccess } from '~~/server/features/event/event.policy';
import { checkInAttendee } from '~~/server/features/event/event.service';
import {
  CreateCheckInRequest,
  EventRouteParams,
} from '~~/shared/contracts/event';

export default defineEventHandler(async (event) => {
  const { eventId } = await parseRouteParams(event, EventRouteParams);
  const { record, organization } = await authorizeEventAccess(
    event,
    eventId,
    'checkIn:create'
  );
  const { cardSlug } = await parseRequestBody(event, CreateCheckInRequest);

  const { registration, created } = await checkInAttendee(event, {
    record,
    organization,
    cardSlug,
  });
  enrichLog(event, {
    registration: {
      event_id: eventId,
      registration_id: registration.id,
      result: 'checked_in',
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
