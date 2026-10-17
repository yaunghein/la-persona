import { and, eq, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '~~/server/db';
import { member, organization } from '~~/server/db/schema';
import { ORGANIZATION_TYPES } from '~~/shared/utils/constants';

async function findOrganizationOfUser(userId: string, personalOnly: boolean) {
  const [row] = await db
    .select({ organization })
    .from(organization)
    .innerJoin(member, eq(member.organizationId, organization.id))
    .where(
      and(
        eq(member.userId, userId),
        personalOnly
          ? eq(organization.type, ORGANIZATION_TYPES.PERSONAL)
          : undefined
      )
    )
    .limit(1);
  return row?.organization ?? null;
}

export function findPersonalOrganization(userId: string) {
  return findOrganizationOfUser(userId, true);
}

export function findAnyOrganization(userId: string) {
  return findOrganizationOfUser(userId, false);
}

/** A personal workspace owned by the user. */
export function insertPersonalOrganization(input: {
  userId: string;
  name: string;
  slug: string;
}) {
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(organization)
      .values({
        id: nanoid(),
        name: input.name,
        slug: input.slug,
        type: ORGANIZATION_TYPES.PERSONAL,
        createdAt: new Date(),
      })
      .returning();
    if (!created) throw new Error('Organization insert returned no row.');
    await tx.insert(member).values({
      id: nanoid(),
      userId: input.userId,
      organizationId: created.id,
      role: 'owner',
      createdAt: new Date(),
    });
    return created;
  });
}

export async function listOwnedPersonalOrganizationIds(userId: string) {
  const rows = await db
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
  return rows.map((row) => row.id);
}

export async function deleteOrganizations(organizationIds: string[]) {
  if (organizationIds.length) {
    await db
      .delete(organization)
      .where(inArray(organization.id, organizationIds));
  }
}
