import { nanoid } from 'nanoid';
import { eq, and } from 'drizzle-orm';
import { db } from '~~/server/db';
import { organization, member } from '~~/server/db/schema';
import { getMembersByUserId } from '~~/server/db/queries/auth';
import { insertDefaultCard } from '~~/server/services/card';
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
  const existingMemberships = await getMembersByUserId(user.id);

  if (existingMemberships.length > 0) {
    // probably invited, maybe different logic or return to handle different flows
    return;
  }

  const newOrg = await insertOrganization(user.name, true);
  await insertMember(user.id, newOrg.id, 'owner');
  await insertDefaultCard(user, newOrg.id);
}

export async function getPersonalOrganizationByUserId(userId: string) {
  const result = await db
    .select({ organization: organization })
    .from(organization)
    .innerJoin(member, eq(member.organizationId, organization.id))
    .where(and(eq(member.userId, userId), eq(organization.isPersonal, true)))
    .limit(1);
  return result.length > 0 ? result[0].organization : null;
}
