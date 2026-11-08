import {
  exportCommunityMembersCsv,
  listCommunityMembers,
} from '~~/server/features/organization/community.service';
import { authorizeCommunityAccess } from '~~/server/features/organization/organization.policy';
import { OrganizationRouteParams } from '~~/shared/contracts/organization';

/** Active members plus pending invitations. `Accept: text/csv` downloads that list. */
export default defineEventHandler(async (event) => {
  const { orgSlug } = await parseRouteParams(event, OrganizationRouteParams);
  const { organization } = await authorizeCommunityAccess(
    event,
    orgSlug,
    'member:create'
  );
  if (!prefersCsv(event)) return listCommunityMembers(organization.id);

  const { csv, rows } = await exportCommunityMembersCsv(organization.id);
  enrichLog(event, { export: { kind: 'members', rows } });
  return respondCsv(event, `members-${orgSlug}.csv`, csv);
});
