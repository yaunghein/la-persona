import { authorizeContactAccess } from '~~/server/features/contact/contact.policy';
import { deleteContact } from '~~/server/features/contact/contact.service';
import { ContactRouteParams } from '~~/shared/contracts/contact';

export default defineEventHandler(async (event) => {
  const { contactId } = await parseRouteParams(event, ContactRouteParams);
  await authorizeContactAccess(event, contactId, 'contactExchange:delete');
  await deleteContact(contactId);
  return respondNoContent(event);
});
