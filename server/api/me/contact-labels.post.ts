import { createContactLabel } from '~~/server/features/contact/contact-label.service';
import { CreateLabelRequest } from '~~/shared/contracts/label';

export default defineEventHandler(async (event) => {
  const principal = requirePrincipal(event);
  const request = await parseRequestBody(event, CreateLabelRequest);

  const created = await createContactLabel(principal.user.id, request);
  enrichLog(event, { label: { id: created.id } });
  return respondCreated(event, `/api/contact-labels/${created.id}`, created);
});
