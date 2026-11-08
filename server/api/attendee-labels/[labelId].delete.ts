import { authorizeAttendeeLabelAccess } from '~~/server/features/event/event.policy';
import { deleteAttendeeLabel } from '~~/server/features/event/attendee-label.repository';
import { LabelRouteParams } from '~~/shared/contracts/label';

/** Removes the label from every registration it was on, past events included. */
export default defineEventHandler(async (event) => {
  const { labelId } = await parseRouteParams(event, LabelRouteParams);
  await authorizeAttendeeLabelAccess(event, labelId, 'attendeeLabel:delete');
  await deleteAttendeeLabel(labelId);
  return respondNoContent(event);
});
