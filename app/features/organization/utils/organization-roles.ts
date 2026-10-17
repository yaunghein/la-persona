import type { UserOrganization } from '~~/shared/contracts/organization';
import {
  canRunCheckIn,
  isCommunityMemberOnly,
  isCommunityVolunteer,
  isOrganizationManagerRole,
} from '~~/shared/permissions/organization';
import { ORGANIZATION_TYPES } from '~~/shared/utils/constants';

export function isCommunityManager(org?: UserOrganization | null) {
  return (
    org?.type === ORGANIZATION_TYPES.COMMUNITY &&
    isOrganizationManagerRole(org.role)
  );
}

/** Members and volunteers share the Events + About community nav. */
export function hasLimitedCommunityAccess(org?: UserOrganization | null) {
  return (
    isCommunityMemberOnly({ type: org?.type, role: org?.role }) ||
    isCommunityVolunteer({ type: org?.type, role: org?.role })
  );
}

export function canRunCommunityCheckIn(org?: UserOrganization | null) {
  return org?.type === ORGANIZATION_TYPES.COMMUNITY && canRunCheckIn(org.role);
}
