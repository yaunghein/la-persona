import { listBillingHistory } from '~~/server/features/billing/billing.service';
import { OrganizationRouteParams } from '~~/shared/contracts/organization';

/** The organization's billing history (one entry per paid card term). */
export default defineEventHandler(async (event) => {
  const { orgSlug } = await parseRouteParams(event, OrganizationRouteParams);
  const { organization } = await authorizeOrganizationAccess(
    event,
    orgSlug,
    'billing:read'
  );
  return listBillingHistory(organization.id);
});
