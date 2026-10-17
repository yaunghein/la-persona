import { and, count, desc, eq, ne } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '~~/server/db';
import {
  card,
  member,
  organization,
  subscriptionPayment,
  user,
} from '~~/server/db/schema';
import { ORGANIZATION_TYPES, type OrganizationType } from '~~/shared/utils/constants';

export async function listOrganizationsWithCounts() {
  const [orgs, memberCounts, cardCounts] = await Promise.all([
    db.select().from(organization).orderBy(desc(organization.createdAt)),
    db
      .select({ organizationId: member.organizationId, value: count(member.id) })
      .from(member)
      .groupBy(member.organizationId),
    db
      .select({ organizationId: card.organizationId, value: count(card.id) })
      .from(card)
      .groupBy(card.organizationId),
  ]);
  const membersByOrg = new Map(memberCounts.map((row) => [row.organizationId, Number(row.value)]));
  const cardsByOrg = new Map(cardCounts.map((row) => [row.organizationId, Number(row.value)]));
  return orgs.map((org) => ({
    ...org,
    memberCount: membersByOrg.get(org.id) ?? 0,
    cardCount: cardsByOrg.get(org.id) ?? 0,
  }));
}

export async function isOrganizationSlugTaken(slug: string, exceptId?: string) {
  const [row] = await db
    .select({ id: organization.id })
    .from(organization)
    .where(and(eq(organization.slug, slug), exceptId ? ne(organization.id, exceptId) : undefined))
    .limit(1);
  return !!row;
}

export async function hasPersonalOrganization(userId: string) {
  const [row] = await db
    .select({ id: organization.id })
    .from(organization)
    .innerJoin(member, eq(member.organizationId, organization.id))
    .where(and(eq(member.userId, userId), eq(organization.type, ORGANIZATION_TYPES.PERSONAL)))
    .limit(1);
  return !!row;
}

export async function userExists(userId: string) {
  const [row] = await db.select({ id: user.id }).from(user).where(eq(user.id, userId)).limit(1);
  return !!row;
}

/** Creates the organization and, when given, its owner membership. */
export function insertOrganizationWithOwner(input: {
  name: string;
  slug: string;
  type: OrganizationType;
  ownerUserId: string | null;
}) {
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(organization)
      .values({
        id: nanoid(),
        name: input.name,
        slug: input.slug,
        type: input.type,
        createdAt: new Date(),
      })
      .returning();
    if (!created) throw new Error('Organization insert returned no row.');
    if (input.ownerUserId) {
      await tx.insert(member).values({
        id: nanoid(),
        userId: input.ownerUserId,
        organizationId: created.id,
        role: 'owner',
        createdAt: new Date(),
      });
    }
    return created;
  });
}

export async function findOrganizationDetail(organizationId: string) {
  const [existing] = await db
    .select()
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);
  if (!existing) return null;

  const [members, cards] = await Promise.all([
    db
      .select({
        id: member.id,
        role: member.role,
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
      })
      .from(member)
      .innerJoin(user, eq(user.id, member.userId))
      .where(eq(member.organizationId, organizationId)),
    db
      .select({
        id: card.id,
        slug: card.slug,
        firstName: card.firstName,
        lastName: card.lastName,
        userId: card.userId,
      })
      .from(card)
      .where(eq(card.organizationId, organizationId)),
  ]);
  return { organization: existing, members, cards };
}

export async function updateOrganizationIdentity(
  organizationId: string,
  values: { name: string; slug: string; logo?: string | null }
) {
  const [row] = await db
    .update(organization)
    .set(values)
    .where(eq(organization.id, organizationId))
    .returning();
  return row ?? null;
}

export async function countOrganizationCardsAndPayments(organizationId: string) {
  const [[cards], [payments]] = await Promise.all([
    db.select({ value: count() }).from(card).where(eq(card.organizationId, organizationId)),
    db
      .select({ value: count() })
      .from(subscriptionPayment)
      .where(eq(subscriptionPayment.organizationId, organizationId)),
  ]);
  return { cardCount: Number(cards?.value ?? 0), paymentCount: Number(payments?.value ?? 0) };
}

export async function listMemberEmails(organizationId: string) {
  const rows = await db
    .select({ email: user.email })
    .from(member)
    .innerJoin(user, eq(user.id, member.userId))
    .where(eq(member.organizationId, organizationId));
  return rows.map((row) => row.email);
}

export async function deleteOrganization(organizationId: string) {
  await db.delete(organization).where(eq(organization.id, organizationId));
}
