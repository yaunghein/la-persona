import { authorizeAttendeeLabelAccess } from '~~/server/features/event/event.policy';
import { editAttendeeLabel } from '~~/server/features/event/attendee-label.service';
import { UpdateAttendeeLabelRequest } from '~~/shared/contracts/event';
import { LabelRouteParams } from '~~/shared/contracts/label';

export default defineEventHandler(async (event) => {
  const { labelId } = await parseRouteParams(event, LabelRouteParams);
  const request = await parseRequestBody(event, UpdateAttendeeLabelRequest);
  const { label } = await authorizeAttendeeLabelAccess(
    event,
    labelId,
    'attendeeLabel:update'
  );
  return editAttendeeLabel(label, request);
});
