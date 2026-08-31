import { nanoid } from 'nanoid';
import { eq, and, ne, inArray, sql } from 'drizzle-orm';
import { db } from '~~/server/db';
import {
  organization,
  member,
  onboardingInvitation,
  card,
} from '~~/server/db/schema';
import { getMembersByUserId } from '~~/server/db/queries/auth';
import { insertDefaultCard } from '~~/server/services/card';
import { normalizeEmail } from '~~/server/services/onboarding-invitation';
import { env } from '~~/server/utils/env';
import type { User } from 'better-auth';

export async function insertOrganization(name: string, isPersonal = false) {
  const [inserted] = await db
    .insert(organization)
    .values({
      id: nanoid(),
      name: isPersonal ? `${name}'s Space` : name,
      slug: `${slugify(name)}-space-${nanoid()}`,
      isPersonal: isPersonal,
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

  const existingMemberships = await getMembersByUserId(user.id);
  if (existingMemberships.length > 0) {
    return;
  }

  const existingInvitation = await getOnboardingInvitationByEmail(user.email);
  if (existingInvitation) {
    return;
  }

  const existingInvitedCard = await getExistingInvitedCardByEmail(user.email);
  if (existingInvitedCard) {
    return;
  }

  const newOrg = await insertOrganization(user.name, true);
  await insertMember(user.id, newOrg.id, 'owner');
  await insertDefaultCard(user, newOrg.id);
}

export async function getOnboardingInvitationByEmail(email: string) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  const [invite] = await db
    .select()
    .from(onboardingInvitation)
    .where(
      and(
        sql`lower(${onboardingInvitation.email}) = ${normalized}`,
        inArray(onboardingInvitation.status, ['pending', 'accepted'])
      )
    )
    .limit(1);

  return invite ?? null;
}

export async function getExistingInvitedCardByEmail(email: string) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  const [existing] = await db
    .select({ id: card.id })
    .from(card)
    .where(
      and(
        sql`lower(trim(coalesce(${card.email}, ''))) = ${normalized}`,
        ne(card.organizationId, env.PLACEHOLDER_ORGANIZATION_ID)
      )
    )
    .limit(1);

  return existing ?? null;
}

export async function getPersonalOrganizationByUserId(userId: string) {
  const result = await db
    .select({ organization: organization })
    .from(organization)
    .innerJoin(member, eq(member.organizationId, organization.id))
    .where(and(eq(member.userId, userId), eq(organization.isPersonal, true)))
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
