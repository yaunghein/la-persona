import { nanoid } from 'nanoid';
import { eq, and, gt } from 'drizzle-orm';
import { db } from '~~/server/db';
import {
  organization,
  member,
  onboardingInvitation,
} from '~~/server/db/schema';
import { getMembersByUserId } from '~~/server/db/queries/auth';
import { insertDefaultCard } from '~~/server/services/card';
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
      // Keep in sync while the column still exists.
      isPersonal,
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

  // TODO: probabily need to revisit later, because if we just early return here, then what
  const pendingInvitation = await getPendingOnboardingInvitationByEmail(
    user.email
  );
  if (pendingInvitation) {
    return;
  }

  const existingMemberships = await getMembersByUserId(user.id);

  if (existingMemberships.length > 0) {
    // probably invited, maybe different logic or return to handle different flows
    return;
  }

  const newOrg = await insertOrganization(
    user.name,
    ORGANIZATION_TYPES.PERSONAL
  );
  await insertMember(user.id, newOrg.id, 'owner');
  await insertDefaultCard(user, newOrg.id);
}

export async function getPendingOnboardingInvitationByEmail(email: string) {
  const normalizedEmail = String(email || '')
    .trim()
    .toLowerCase();
  if (!normalizedEmail) return null;

  return await db.query.onboardingInvitation.findFirst({
    where: and(
      eq(onboardingInvitation.email, normalizedEmail),
      eq(onboardingInvitation.status, 'pending'),
      gt(onboardingInvitation.expiresAt, new Date())
    ),
  });
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
