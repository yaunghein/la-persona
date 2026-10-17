import type { H3Event } from 'h3';
import { env } from '~~/env';
import { auth } from '~~/server/auth';
import {
  findUser,
  findUserFootprint,
  listUsers,
  updateUserName,
} from '~~/server/features/auth/user-admin.repository';
import { deletePersonalOrganizationsForUser } from '~~/server/services/auth';
import type {
  AdminUserDetail,
  AdminUserSummary,
  CreateUserRequest,
  UpdateUserRequest,
} from '~~/shared/contracts/account';
import type { Collection } from '~~/shared/contracts/collection';
import { ORGANIZATION_TYPES, type OrganizationType } from '~~/shared/utils/constants';

export async function listAccounts(): Promise<Collection<AdminUserSummary>> {
  const rows = await listUsers();
  return {
    items: rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      banned: Boolean(row.banned),
      createdAt: row.createdAt.toISOString(),
      label: row.name ? `${row.name} (${row.email})` : row.email,
      ...(row.image ? { avatar: { src: row.image } } : {}),
    })),
  };
}

export async function describeAccount(userId: string): Promise<AdminUserDetail> {
  const account = await findUser(userId);
  if (!account) throw notFound('User');
  const footprint = await findUserFootprint(userId);
  const memberships = footprint.memberships.map((row) => ({
    ...row,
    organizationType: row.organizationType as OrganizationType | null,
  }));
  return {
    ...account,
    banned: Boolean(account.banned),
    createdAt: account.createdAt.toISOString(),
    memberships,
    cards: footprint.cards,
    deletion: {
      personalOrganizations: footprint.personalOrganizations
        .filter((org) => org.id !== env.PLACEHOLDER_ORGANIZATION_ID)
        .map((org) => ({ ...org, cardCount: Number(org.cardCount) })),
      communityMemberships: memberships.filter(
        (row) => row.organizationType === ORGANIZATION_TYPES.COMMUNITY
      ),
    },
  };
}

function isDuplicateEmailError(error: unknown) {
  const body = (error as { body?: { message?: unknown } } | undefined)?.body;
  const message = String(body?.message ?? (error instanceof Error ? error.message : ''));
  return /already exists/i.test(message);
}

export async function createAccount(event: H3Event, request: CreateUserRequest) {
  try {
    const created = await auth.api.createUser({ body: request, headers: event.headers });
    return {
      id: created.user.id,
      name: created.user.name,
      email: created.user.email,
      role: created.user.role ?? request.role,
    };
  } catch (error) {
    if (isDuplicateEmailError(error)) {
      throw conflict('A user with that email already exists.', 'email_taken');
    }
    throw error;
  }
}

/**
 * Role and ban changes go through better-auth so a ban also revokes every
 * active session immediately. Admins cannot change their own role or ban.
 */
export async function updateAccount(
  event: H3Event,
  params: { userId: string; actorUserId: string; changes: UpdateUserRequest }
) {
  const { userId, actorUserId, changes } = params;
  if (
    userId === actorUserId &&
    (changes.role !== undefined || changes.banned !== undefined)
  ) {
    throw forbidden('You cannot change your own role or ban state.', 'self_change');
  }

  const existing = await findUser(userId);
  if (!existing) throw notFound('User');

  const changed: string[] = [];
  if (changes.name !== undefined && changes.name !== existing.name) {
    await updateUserName(userId, changes.name);
    changed.push('name');
  }
  if (changes.role !== undefined && changes.role !== existing.role) {
    await auth.api.setRole({ body: { userId, role: changes.role }, headers: event.headers });
    changed.push('role');
  }
  if (changes.banned !== undefined && changes.banned !== Boolean(existing.banned)) {
    if (changes.banned) {
      await auth.api.banUser({ body: { userId }, headers: event.headers });
    } else {
      await auth.api.unbanUser({ body: { userId }, headers: event.headers });
    }
    changed.push('banned');
  }

  return { account: existing, changed };
}

/** Deletes personal workspaces and the account; community memberships end with it. */
export async function deleteAccount(
  event: H3Event,
  params: { userId: string; actorUserId: string }
) {
  if (params.userId === params.actorUserId) {
    throw forbidden('You cannot delete your own account.', 'self_delete');
  }
  const existing = await findUser(params.userId);
  if (!existing) throw notFound('User');

  const footprint = await findUserFootprint(params.userId);
  const deletedOrganizationIds = await deletePersonalOrganizationsForUser(params.userId);
  // removeUser also deletes the user's sessions.
  await auth.api.removeUser({ body: { userId: params.userId }, headers: event.headers });

  return {
    account: existing,
    deletedOrganizationIds,
    communityOrganizationIds: footprint.memberships
      .filter((row) => row.organizationType === ORGANIZATION_TYPES.COMMUNITY)
      .map((row) => row.organizationId),
  };
}
