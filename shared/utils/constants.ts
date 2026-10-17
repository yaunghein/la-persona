export const ORGANIZATION_TYPES = {
  PERSONAL: 'personal',
  COMMUNITY: 'community',
} as const;
export type OrganizationType =
  (typeof ORGANIZATION_TYPES)[keyof typeof ORGANIZATION_TYPES];

export const ORGANIZATION_TYPE_LABELS: Record<OrganizationType, string> = {
  [ORGANIZATION_TYPES.PERSONAL]: 'Personal',
  [ORGANIZATION_TYPES.COMMUNITY]: 'Community',
};
