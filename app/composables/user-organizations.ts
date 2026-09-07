import { useQuery } from '@tanstack/vue-query';
import type { OrganizationType } from '~~/shared/utils/constants';

export type UserOrganization = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  type: OrganizationType;
};

export const userOrganizationsQueryKey = ['organizations'] as const;

export function useUserOrganizations() {
  return useQuery({
    queryKey: userOrganizationsQueryKey,
    queryFn: () => $fetch<UserOrganization[]>('/api/organizations'),
  });
}
