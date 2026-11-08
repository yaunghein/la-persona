import { authorizeContactLabelAccess } from '~~/server/features/contact/contact.policy';
import { editContactLabel } from '~~/server/features/contact/contact-label.service';
import {
  LabelRouteParams,
  UpdateLabelRequest,
} from '~~/shared/contracts/label';

export default defineEventHandler(async (event) => {
  const { labelId } = await parseRouteParams(event, LabelRouteParams);
  const request = await parseRequestBody(event, UpdateLabelRequest);
  const { label } = await authorizeContactLabelAccess(event, labelId);
  return editContactLabel(label, request);
});
