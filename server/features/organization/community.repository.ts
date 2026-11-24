import { and, count, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '~~/server/db';
import type { Transaction } from '~~/server/features/billing/billing.repository';
import {
  card,
  communitySetting,
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

export async function findCommunityBySlug(slug: string) {
  const [row] = await db
    .select()
    .from(organization)
    .where(
      and(
        eq(organization.slug, slug),
        eq(organization.type, ORGANIZATION_TYPES.COMMUNITY)
      )
    )
    .limit(1);
  return row ?? null;
}

export async function updateOrganizationProfile(
  organizationId: string,
  values: { name: string; logo?: string | null }
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
    .where(eq(member.userId, userId))
    .orderBy(desc(member.createdAt), desc(organization.id));
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
    .onConflictDoNothing({ target: [member.organizationId, member.userId] })
    .returning();
  return row ?? null;
}

/**
 * With `tx`, locks the organization row first, so two removals running at once
 * can't both count the other admin and leave none.
 */
export async function countOwners(organizationId: string, tx?: Transaction) {
  if (tx) {
    await tx
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .for('update');
  }
  const [row] = await (tx ?? db)
    .select({ value: count() })
    .from(member)
    .where(
      and(eq(member.organizationId, organizationId), eq(member.role, 'admin'))
    );
  return Number(row?.value ?? 0);
}

/**
 * The card "Contact Organizer" opens: the organizer chosen in community
 * settings. null (nothing chosen, no longer an organizer, or no card here)
 * hides the button.
 */
export async function findOrganizerCardSlug(organizationId: string) {
  const [row] = await db
    .select({ slug: card.slug })
    .from(communitySetting)
    .innerJoin(member, eq(member.id, communitySetting.organizerMemberId))
    .innerJoin(
      card,
      and(
        eq(card.userId, member.userId),
        eq(card.organizationId, member.organizationId),
        isNull(card.removedAt)
      )
    )
    .where(
      and(
        eq(communitySetting.organizationId, organizationId),
        eq(member.role, 'admin')
      )
    )
    .orderBy(desc(card.createdAt))
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

export async function findUserCardInOrganization(
  userId: string,
  organizationId: string
) {
  const [row] = await db
    .select()
    .from(card)
    .where(
      and(
        eq(card.userId, userId),
        eq(card.organizationId, organizationId),
        isNull(card.removedAt)
      )
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
        eq(organization.type, ORGANIZATION_TYPES.PERSONAL),
        isNull(card.removedAt)
      )
    )
    .orderBy(desc(card.createdAt))
    .limit(1);
  return row?.card ?? null;
}

/**
 * Inserts a member's community card unless they already hold one. Overlapping
 * joins (a double click, link and invite at once) wait on a per-member lock,
 * so the second one finds the first one's card instead of adding another.
 */
export async function insertCommunityCard(
  values: typeof card.$inferInsert & { userId: string; organizationId: string }
) {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`community-card:${values.organizationId}:${values.userId}`}))`
    );
    const [existing] = await tx
      .select()
      .from(card)
      .where(
        and(
          eq(card.userId, values.userId),
          eq(card.organizationId, values.organizationId),
          isNull(card.removedAt)
        )
      )
      .limit(1);
    if (existing) return existing;
    const [row] = await tx.insert(card).values(values).returning();
    return row ?? null;
  });
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

export function listMembersWithUsers(organizationId: string) {
  return db
    .select({ member, user })
    .from(member)
    .innerJoin(user, eq(user.id, member.userId))
    .where(eq(member.organizationId, organizationId))
    .orderBy(desc(member.createdAt), desc(member.id));
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
        inArray(card.userId, userIds),
        isNull(card.removedAt)
      )
    )
    .orderBy(desc(card.createdAt), desc(card.id));
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
    )
    .orderBy(desc(invitation.createdAt), desc(invitation.id));
}

/**
 * Admin (Organizer) invitations are sent by platform admins, who are not
 * members, so they bypass better-auth's createInvitation. A pending invite for
 * the same email and role is refreshed instead of duplicated.
 */
export async function upsertPendingInvitation(values: {
  organizationId: string;
  email: string;
  role: OrganizationMemberRole;
  inviterId: string;
  expiresAt: Date;
}) {
  const [refreshed] = await db
    .update(invitation)
    .set({ inviterId: values.inviterId, expiresAt: values.expiresAt })
    .where(
      and(
        eq(invitation.organizationId, values.organizationId),
        eq(invitation.email, values.email),
        eq(invitation.role, values.role),
        eq(invitation.status, 'pending')
      )
    )
    .returning();
  if (refreshed) return refreshed;

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

/** Soft-removes every community card a user holds, so none stays public without a holder. */
export async function removeCommunityCardsOfUser(userId: string) {
  await db
    .update(card)
    .set({ removedAt: new Date() })
    .where(
      and(
        eq(card.userId, userId),
        isNull(card.removedAt),
        inArray(
          card.organizationId,
          db
            .select({ id: organization.id })
            .from(organization)
            .where(eq(organization.type, ORGANIZATION_TYPES.COMMUNITY))
        )
      )
    );
}

/**
 * Removes a member: their community card is soft-removed (its link stops
 * working, its contacts stay with the member and the organizers), and their
 * sessions stop defaulting to this organization.
 */
export async function deleteMemberWithCommunityData(
  target: {
    memberId: string;
    userId: string;
    organizationId: string;
  },
  executor: typeof db | Transaction = db
) {
  await executor.transaction(async (tx) => {
    await tx
      .update(card)
      .set({ removedAt: new Date() })
      .where(
        and(
          eq(card.userId, target.userId),
          eq(card.organizationId, target.organizationId),
          isNull(card.removedAt)
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
