import { contactOwnerScope } from '~~/server/features/contact/contact.policy';
import {
  exportContactsCsv,
  listContactPage,
  organizationContactScope,
} from '~~/server/features/contact/contact.service';
import { ListContactsQuery } from '~~/shared/contracts/contact';
import { OrganizationRouteParams } from '~~/shared/contracts/organization';

/** JSON page by default; `Accept: text/csv` downloads every matching contact. */
export default defineEventHandler(async (event) => {
  const { orgSlug } = await parseRouteParams(event, OrganizationRouteParams);
  const access = await authorizeOrganizationAccess(
    event,
    orgSlug,
    'contactExchange:read'
  );
  const query = await parseRequestQuery(event, ListContactsQuery);
  const ownerUserId = contactOwnerScope(access);
  const scope = organizationContactScope(access.organization.id, ownerUserId);

  if (prefersCsv(event)) {
    const csv = await exportContactsCsv(scope, query, {
      includeOrigin: ownerUserId === null,
    });
    return respondCsv(event, `contacts-${orgSlug}.csv`, csv);
  }
  return listContactPage(scope, query);
});
