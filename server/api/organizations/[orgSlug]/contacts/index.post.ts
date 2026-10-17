import { contactOwnerScope } from '~~/server/features/contact/contact.policy';
import { createManualContact } from '~~/server/features/contact/contact.service';
import { CreateManualContactRequest } from '~~/shared/contracts/contact';
import { OrganizationRouteParams } from '~~/shared/contracts/organization';

export default defineEventHandler(async (event) => {
  const { orgSlug } = await parseRouteParams(event, OrganizationRouteParams);
  const access = await authorizeOrganizationAccess(
    event,
    orgSlug,
    'contactExchange:create'
  );
  const input = await parseRequestBody(event, CreateManualContactRequest);

  const contact = await createManualContact({
    organizationId: access.organization.id,
    ownerUserId: contactOwnerScope(access),
    input,
  });
  enrichLog(event, {
    contact: {
      id: contact.id,
      card_id: contact.cardId,
      source: 'manual',
      ...(contact.email ? { email: contact.email } : {}),
    },
  });

  return respondCreated(event, `/api/contacts/${contact.id}`, {
    id: contact.id,
  });
});
