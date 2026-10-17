import { findRegistrationById } from '~~/server/features/event/registration.repository';
import { authorizeEventAccess } from '~~/server/features/event/event.policy';
import { approveRegistration } from '~~/server/features/event/event.service';
import {
  RegistrationRouteParams,
  ReviewRegistrationRequest,
} from '~~/shared/contracts/event';

/** An organizer confirms a registration that waits for approval. */
export default defineEventHandler(async (event) => {
  const { registrationId } = await parseRouteParams(
    event,
    RegistrationRouteParams
  );
  await parseRequestBody(event, ReviewRegistrationRequest);

  const registration = await findRegistrationById(registrationId);
  if (!registration) throw notFound('Registration');
  const { record, organization } = await authorizeEventAccess(
    event,
    registration.eventId,
    'event:update'
  );

  const result = await approveRegistration(event, {
    record,
    organization,
    registration,
  });
  enrichLog(event, {
    registration: {
      event_id: record.id,
      registration_id: registrationId,
      result: result.status,
    },
  });
  return { id: registrationId, status: result.status };
});
