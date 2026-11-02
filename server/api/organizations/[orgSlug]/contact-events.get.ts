import { contactOwnerScope } from '~~/server/features/contact/contact.policy';
import {
  listContactEventCollection,
  organizationContactScope,
} from '~~/server/features/contact/contact.service';
import { OrganizationRouteParams } from '~~/shared/contracts/organization';

/** Events that appear on the caller's contacts here, for the "where you met" filter. */
export default defineEventHandler(async (event) => {
  const { orgSlug } = await parseRouteParams(event, OrganizationRouteParams);
  const access = await authorizeOrganizationAccess(
    event,
    orgSlug,
    'contactExchange:read'
  );
  return listContactEventCollection(
    organizationContactScope(access.organization.id, contactOwnerScope(access))
  );
});
