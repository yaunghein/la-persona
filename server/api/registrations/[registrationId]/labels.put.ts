import { setRegistrationLabels } from '~~/server/features/event/attendee-label.service';
import { authorizeEventAccess } from '~~/server/features/event/event.policy';
import { findRegistrationById } from '~~/server/features/event/registration.repository';
import type { Collection } from '~~/shared/contracts/collection';
import {
  RegistrationRouteParams,
  ReplaceRegistrationLabelsRequest,
} from '~~/shared/contracts/event';
import type { Label } from '~~/shared/contracts/label';

/** An organizer sets an attendee's labels for this event only. */
export default defineEventHandler(async (event): Promise<Collection<Label>> => {
  const { registrationId } = await parseRouteParams(
    event,
    RegistrationRouteParams
  );
  const { labelIds } = await parseRequestBody(
    event,
    ReplaceRegistrationLabelsRequest
  );

  const registration = await findRegistrationById(registrationId);
  if (!registration) throw notFound('Registration');
  const { record } = await authorizeEventAccess(
    event,
    registration.eventId,
    'attendeeLabel:update'
  );

  enrichLog(event, {
    registration: {
      event_id: record.id,
      registration_id: registrationId,
      label_ids: labelIds,
    },
  });
  return {
    items: await setRegistrationLabels(
      registrationId,
      record.organizationId,
      labelIds
    ),
  };
});
