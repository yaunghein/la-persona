import { authorizeContactAccess } from '~~/server/features/contact/contact.policy';
import { editContact } from '~~/server/features/contact/contact.service';
import {
  ContactRouteParams,
  UpdateContactRequest,
} from '~~/shared/contracts/contact';

export default defineEventHandler(async (event) => {
  const { contactId } = await parseRouteParams(event, ContactRouteParams);
  const request = await parseRequestBody(event, UpdateContactRequest);
  const { contact } = await authorizeContactAccess(
    event,
    contactId,
    'contactExchange:update'
  );
  if (request.eventId !== undefined) {
    enrichLog(event, { contact: { event_id: request.eventId } });
  }
  return editContact(contact, request);
});
