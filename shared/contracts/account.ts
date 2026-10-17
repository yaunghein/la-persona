import { z } from 'zod';
import type { OrganizationType } from '~~/shared/utils/constants';

export const PLATFORM_ROLES = ['user', 'admin'] as const;

export const AdminUserRouteParams = z.object({
  userId: z.string().trim().min(1),
});

export const CreateUserRequest = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.email().trim().toLowerCase(),
  password: z.string().min(8).max(200),
  role: z.enum(PLATFORM_ROLES).default('user'),
});

export type CreateUserRequest = z.infer<typeof CreateUserRequest>;

export const UpdateUserRequest = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    role: z.enum(PLATFORM_ROLES).optional(),
    banned: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined || value.role !== undefined || value.banned !== undefined,
    { message: 'Change at least one of name, role or banned.', path: ['name'] }
  );

export type UpdateUserRequest = z.infer<typeof UpdateUserRequest>;

export type AdminUserSummary = {
  id: string;
  name: string;
  email: string;
  role: string | null;
  banned: boolean;
  createdAt: string;
  label: string;
  avatar?: { src: string };
};

export type AdminUserDetail = {
  id: string;
  name: string;
  email: string;
  role: string | null;
  banned: boolean;
  createdAt: string;
  memberships: {
    id: string;
    role: string;
    organizationId: string;
    organizationName: string;
    organizationSlug: string;
    organizationType: OrganizationType | null;
  }[];
  cards: {
    id: string;
    slug: string;
    firstName: string;
    lastName: string | null;
    organizationId: string;
  }[];
  /** What deleting this user removes. */
  deletion: {
    personalOrganizations: { id: string; name: string; cardCount: number }[];
    communityMemberships: AdminUserDetail['memberships'];
  };
};
