import { nanoid } from 'nanoid';
import { eq, and, inArray } from 'drizzle-orm';
import { db } from '~~/server/db';
import { organization, member } from '~~/server/db/schema';
import { insertDefaultCard } from '~~/server/services/card';
import { getPendingOnboardingInvitationByEmail } from '~~/server/services/onboarding-invitation';
import { env } from '~~/server/utils/env';
import type { User } from 'better-auth';
import {
  ORGANIZATION_TYPES,
  type OrganizationType,
} from '~~/shared/utils/constants';
import { slugify } from '~~/shared/utils/slugify';

export async function insertOrganization(
  name: string,
  type: OrganizationType = ORGANIZATION_TYPES.PERSONAL
) {
  const isPersonal = type === ORGANIZATION_TYPES.PERSONAL;
  const [inserted] = await db
    .insert(organization)
    .values({
      id: nanoid(),
      name: isPersonal ? `${name}'s Space` : name,
      slug: `${slugify(name)}-space-${nanoid()}`,
      type,
      createdAt: new Date(),
    })
    .returning();

  if (!inserted) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create organization',
    });
  }

  return inserted;
}

export async function insertMember(
  userId: string,
  organizationId: string,
  role: 'owner' | 'member' = 'member'
) {
  return await db
    .insert(member)
    .values({
      id: nanoid(),
      userId,
      organizationId,
      role,
      createdAt: new Date(),
    })
    .returning();
}

export async function setupDefaultOrganization(user: User) {
  const existingPersonalOrganization = await getPersonalOrganizationByUserId(
    user.id
  );
  if (existingPersonalOrganization) {
    return;
  }

  const existingInvitation = await getPendingOnboardingInvitationByEmail(
    user.email
  );
  if (existingInvitation) {
    return;
  }

  const newOrg = await insertOrganization(
    user.name,
    ORGANIZATION_TYPES.PERSONAL
  );
  await insertMember(user.id, newOrg.id, 'owner');
  await insertDefaultCard(user, newOrg.id);
}

export async function getPersonalOrganizationByUserId(userId: string) {
  const result = await db
    .select({ organization: organization })
    .from(organization)
    .innerJoin(member, eq(member.organizationId, organization.id))
    .where(
      and(
        eq(member.userId, userId),
        eq(organization.type, ORGANIZATION_TYPES.PERSONAL)
      )
    )
    .limit(1);
  const first = result[0];
  return first ? first.organization : null;
}

export async function getAnyOrganizationByUserId(userId: string) {
  const result = await db
    .select({ organization: organization })
    .from(organization)
    .innerJoin(member, eq(member.organizationId, organization.id))
    .where(eq(member.userId, userId))
    .limit(1);
  const first = result[0];
  return first ? first.organization : null;
}

export async function deletePersonalOrganizationsForUser(userId: string) {
  const personalOrgs = await db
    .select({ id: organization.id })
    .from(organization)
    .innerJoin(member, eq(member.organizationId, organization.id))
    .where(
      and(
        eq(member.userId, userId),
        eq(member.role, 'owner'),
        eq(organization.type, ORGANIZATION_TYPES.PERSONAL)
      )
    );

  const ids = personalOrgs
    .map((row) => row.id)
    .filter((id) => id !== env.PLACEHOLDER_ORGANIZATION_ID);

  if (ids.length === 0) return [];

  await db.delete(organization).where(inArray(organization.id, ids));
  return ids;
}
