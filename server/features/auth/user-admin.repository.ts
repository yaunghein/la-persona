import { and, asc, count, eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import { card, member, organization, user } from '~~/server/db/schema';
import { ORGANIZATION_TYPES } from '~~/shared/utils/constants';

export function listUsers() {
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      banned: user.banned,
      createdAt: user.createdAt,
    })
    .from(user)
    .orderBy(asc(user.name));
}

export async function findUser(userId: string) {
  const [row] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      banned: user.banned,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  return row ?? null;
}

export async function findUserFootprint(userId: string) {
  const [memberships, cards, personalOrganizations] = await Promise.all([
    db
      .select({
        id: member.id,
        role: member.role,
        organizationId: organization.id,
        organizationName: organization.name,
        organizationSlug: organization.slug,
        organizationType: organization.type,
      })
      .from(member)
      .innerJoin(organization, eq(organization.id, member.organizationId))
      .where(eq(member.userId, userId)),
    db
      .select({
        id: card.id,
        slug: card.slug,
        firstName: card.firstName,
        lastName: card.lastName,
        organizationId: card.organizationId,
      })
      .from(card)
      .where(eq(card.userId, userId)),
    db
      .select({
        id: organization.id,
        name: organization.name,
        cardCount: count(card.id),
      })
      .from(organization)
      .innerJoin(member, eq(member.organizationId, organization.id))
      .leftJoin(card, eq(card.organizationId, organization.id))
      .where(
        and(
          eq(member.userId, userId),
          eq(member.role, 'admin'),
          eq(organization.type, ORGANIZATION_TYPES.PERSONAL)
        )
      )
      .groupBy(organization.id, organization.name),
  ]);
  return { memberships, cards, personalOrganizations };
}

export async function updateUserName(userId: string, name: string) {
  await db
    .update(user)
    .set({ name, updatedAt: new Date() })
    .where(eq(user.id, userId));
}
