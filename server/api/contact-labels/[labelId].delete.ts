import { authorizeContactLabelAccess } from '~~/server/features/contact/contact.policy';
import { deleteContactLabel } from '~~/server/features/contact/contact-label.repository';
import { LabelRouteParams } from '~~/shared/contracts/label';

/** Removes the label from every contact it was on. */
export default defineEventHandler(async (event) => {
  const { labelId } = await parseRouteParams(event, LabelRouteParams);
  await authorizeContactLabelAccess(event, labelId);
  await deleteContactLabel(labelId);
  return respondNoContent(event);
});
