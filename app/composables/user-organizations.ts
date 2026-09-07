import { useQuery } from '@tanstack/vue-query';
import {
  isCommunityMemberOnly,
  isOrganizationManagerRole,
  type OrganizationMemberRole,
} from '~~/shared/permissions/organization';
import {
  ORGANIZATION_TYPES,
  type OrganizationType,
} from '~~/shared/utils/constants';

export type UserOrganization = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  type: OrganizationType;
  role: OrganizationMemberRole;
};

export const userOrganizationsQueryKey = ['organizations'] as const;

export function useUserOrganizations() {
  return useQuery({
    queryKey: userOrganizationsQueryKey,
    queryFn: () => $fetch<UserOrganization[]>('/api/organizations'),
  });
}

export function isCommunityManager(org?: UserOrganization | null) {
  return (
    org?.type === ORGANIZATION_TYPES.COMMUNITY &&
    isOrganizationManagerRole(org.role)
  );
}

export function isCommunityMemberOnlyOrg(org?: UserOrganization | null) {
  return isCommunityMemberOnly({ type: org?.type, role: org?.role });
}
