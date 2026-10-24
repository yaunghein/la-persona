import { and, asc, count, desc, eq, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '~~/server/db';
import {
  card,
  event as eventTable,
  invitation,
  member,
  organization,
  session,
  user,
} from '~~/server/db/schema';
import type { OrganizationMemberRole } from '~~/shared/permissions/organization';
import { ORGANIZATION_TYPES } from '~~/shared/utils/constants';

export async function findOrganizationById(organizationId: string) {
  const [row] = await db
    .select()
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);
  return row ?? null;
}

export async function updateOrganizationProfile(
  organizationId: string,
  values: { name: string; logo: string | null }
) {
  const [row] = await db
    .update(organization)
    .set(values)
    .where(eq(organization.id, organizationId))
    .returning({ name: organization.name, logo: organization.logo });
  return row ?? null;
}

/** Every organization the user belongs to, with their role. */
export function listUserOrganizations(userId: string) {
  return db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      logo: organization.logo,
      type: organization.type,
      role: member.role,
    })
    .from(organization)
    .innerJoin(member, eq(member.organizationId, organization.id))
    .where(eq(member.userId, userId));
}

export async function countMembersAndEvents(organizationId: string) {
  const [[members], [events]] = await Promise.all([
    db
      .select({ value: count() })
      .from(member)
      .where(eq(member.organizationId, organizationId)),
    db
      .select({ value: count() })
      .from(eventTable)
      .where(eq(eventTable.organizationId, organizationId)),
  ]);
  return {
    memberCount: Number(members?.value ?? 0),
    eventCount: Number(events?.value ?? 0),
  };
}

export async function findMembership(userId: string, organizationId: string) {
  const [row] = await db
    .select()
    .from(member)
    .where(
      and(eq(member.userId, userId), eq(member.organizationId, organizationId))
    )
    .limit(1);
  return row ?? null;
}

export async function findMemberById(memberId: string) {
  const [row] = await db
    .select()
    .from(member)
    .where(eq(member.id, memberId))
    .limit(1);
  return row ?? null;
}

export async function findMemberInOrganization(
  memberId: string,
  organizationId: string
) {
  const [row] = await db
    .select()
    .from(member)
    .where(
      and(eq(member.id, memberId), eq(member.organizationId, organizationId))
    )
    .limit(1);
  return row ?? null;
}

export async function insertMember(
  userId: string,
  organizationId: string,
  role: OrganizationMemberRole
) {
  const [row] = await db
    .insert(member)
    .values({
      id: nanoid(),
      userId,
      organizationId,
      role,
      createdAt: new Date(),
    })
    .returning();
  return row ?? null;
}

export async function countOwners(organizationId: string) {
  const [row] = await db
    .select({ value: count() })
    .from(member)
    .where(
      and(eq(member.organizationId, organizationId), eq(member.role, 'owner'))
    );
  return Number(row?.value ?? 0);
}

/** The slug of the earliest owner's card, shown as the community's organizer. */
export async function findOrganizerCardSlug(organizationId: string) {
  const [row] = await db
    .select({ slug: card.slug })
    .from(member)
    .innerJoin(
      card,
      and(
        eq(card.userId, member.userId),
        eq(card.organizationId, member.organizationId)
      )
    )
    .where(
      and(eq(member.organizationId, organizationId), eq(member.role, 'owner'))
    )
    .orderBy(asc(member.createdAt), desc(card.createdAt))
    .limit(1);
  return row?.slug ?? null;
}

export async function findUserAccount(userId: string) {
  const [row] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  return row ?? null;
}

export async function findUserIdByEmail(email: string) {
  const [row] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);
  return row?.id ?? null;
}

export async function findUserCardInOrganization(
  userId: string,
  organizationId: string
) {
  const [row] = await db
    .select()
    .from(card)
    .where(
      and(eq(card.userId, userId), eq(card.organizationId, organizationId))
    )
    .orderBy(desc(card.createdAt))
    .limit(1);
  return row ?? null;
}

export async function findPersonalCardOfUser(userId: string) {
  const [row] = await db
    .select({ card })
    .from(card)
    .innerJoin(organization, eq(organization.id, card.organizationId))
    .where(
      and(
        eq(card.userId, userId),
        eq(organization.type, ORGANIZATION_TYPES.PERSONAL)
      )
    )
    .orderBy(desc(card.createdAt))
    .limit(1);
  return row?.card ?? null;
}

export async function insertCard(values: typeof card.$inferInsert) {
  const [row] = await db.insert(card).values(values).returning();
  return row ?? null;
}

/** Re-brands every member card when the community changes its card design. */
export async function updateCommunityCardsBrand(
  organizationId: string,
  values: { splineUrl: string; wallpaperUrl: string; cardBackUrl: string }
) {
  await db
    .update(card)
    .set(values)
    .where(eq(card.organizationId, organizationId));
}

export function listRosterMembers(organizationId: string) {
  return db
    .select({ member, user })
    .from(member)
    .innerJoin(user, eq(user.id, member.userId))
    .where(eq(member.organizationId, organizationId));
}

export function listCardsOfUsersInOrganization(
  userIds: string[],
  organizationId: string
) {
  if (!userIds.length) return Promise.resolve([]);
  return db
    .select()
    .from(card)
    .where(
      and(
        eq(card.organizationId, organizationId),
        inArray(card.userId, userIds)
      )
    );
}

export function listPendingInvitations(organizationId: string) {
  return db
    .select()
    .from(invitation)
    .where(
      and(
        eq(invitation.organizationId, organizationId),
        eq(invitation.status, 'pending')
      )
    );
}

/** Owner invitations are sent by platform admins, who are not members, so they bypass better-auth's createInvitation. */
export async function insertInvitation(values: {
  organizationId: string;
  email: string;
  role: OrganizationMemberRole;
  inviterId: string;
  expiresAt: Date;
}) {
  const [row] = await db
    .insert(invitation)
    .values({ id: nanoid(), status: 'pending', ...values })
    .returning();
  if (!row) throw new Error('Invitation insert returned no row.');
  return row;
}

export async function findInvitationById(invitationId: string) {
  const [row] = await db
    .select()
    .from(invitation)
    .where(eq(invitation.id, invitationId))
    .limit(1);
  return row ?? null;
}

/**
 * Removes a member and what they hold in the community: their community
 * card (with its analytics and contacts), and their sessions stop defaulting
 * to this organization.
 */
export async function deleteMemberWithCommunityData(target: {
  memberId: string;
  userId: string;
  organizationId: string;
}) {
  await db.transaction(async (tx) => {
    await tx
      .delete(card)
      .where(
        and(
          eq(card.userId, target.userId),
          eq(card.organizationId, target.organizationId)
        )
      );
    await tx.delete(member).where(eq(member.id, target.memberId));
    await tx
      .update(session)
      .set({ activeOrganizationId: null })
      .where(
        and(
          eq(session.userId, target.userId),
          eq(session.activeOrganizationId, target.organizationId)
        )
      );
  });
}
