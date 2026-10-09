import { and, count, eq, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '~~/server/db';
import {
  card,
  event as eventTable,
  invitation,
  member,
  organization,
  user,
} from '~~/server/db/schema';
import { env } from '~~/server/utils/env';
import { slugify } from '~~/shared/utils/slugify';
import { ORGANIZATION_TYPES } from '~~/shared/utils/constants';
import { splitName } from '~~/server/services/card';
import { insertMember } from '~~/server/services/auth';
import {
  ensureCommunitySetting,
  findCommunitySettingByOrganizationId,
} from '~~/server/db/queries/community-setting';
import {
  findCardByUserIdAndOrganization,
  findCardsByUserIdAndOrganization,
} from '~~/server/db/queries/card';
import { countContactsByCardIds } from '~~/server/db/queries/contact-exchange';
import {
  countCheckedInByUsersInOrganization,
  deleteRegistrationsForUserInOrganization,
} from '~~/server/db/queries/event-registration';
import type { CommunityMember } from '~~/shared/types/community-members';
import { isOrganizationManagerRole } from '~~/shared/permissions/organization';
import { ROUTES } from '~~/shared/utils/routes';

function linkedinFromSocials(
  socials: { label: string; value: string }[] | null | undefined
) {
  const match = (socials || []).find((item) =>
    item.label.toLowerCase().includes('linkedin')
  );
  return match?.value || null;
}

function displayName(firstName: string, lastName?: string | null) {
  return [firstName, lastName].filter(Boolean).join(' ').trim();
}

export function communityRedirectPath(params: {
  organizationSlug: string;
  role?: string | null;
}) {
  return `${ROUTES.PLATFORM.ROOT}/${params.organizationSlug}`;
}

export function communityInviteLink(token: string) {
  return `${env.BASE_URL}${ROUTES.INVITE.COMMUNITY_JOIN(token)}`;
}

export function communityInvitationLink(invitationId: string) {
  return `${env.BASE_URL}${ROUTES.INVITE.COMMUNITY_ACCEPT(invitationId)}`;
}

export async function getCommunityInviteStats(organizationId: string) {
  const org = await db.query.organization.findFirst({
    where: eq(organization.id, organizationId),
    columns: { createdAt: true },
  });
  const setting = await findCommunitySettingByOrganizationId(organizationId);

  const [memberRow] = await db
    .select({ value: count() })
    .from(member)
    .where(eq(member.organizationId, organizationId));

  const [eventRow] = await db
    .select({ value: count() })
    .from(eventTable)
    .where(eq(eventTable.organizationId, organizationId));

  return {
    coverUrl: setting?.coverUrl ?? null,
    memberCount: Number(memberRow?.value ?? 0),
    eventCount: Number(eventRow?.value ?? 0),
    foundedYear: org?.createdAt
      ? new Date(org.createdAt).getFullYear()
      : new Date().getFullYear(),
  };
}

export async function ensureCommunityCard(userId: string, organizationId: string) {
  const existing = await findCardByUserIdAndOrganization(userId, organizationId);
  if (existing) return existing;

  const setting = await ensureCommunitySetting(organizationId);
  if (!setting) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to load community settings',
    });
  }

  const personalOrg = await db
    .select({ id: organization.id })
    .from(organization)
    .innerJoin(member, eq(member.organizationId, organization.id))
    .where(
      and(
        eq(member.userId, userId),
        eq(organization.type, ORGANIZATION_TYPES.PERSONAL)
      )
    )
    .limit(1)
    .then((rows) => rows[0]);

  const personalCards = personalOrg
    ? await findCardsByUserIdAndOrganization(userId, personalOrg.id)
    : [];
  const personalCard = personalCards[0] ?? null;

  const account = await db.query.user.findFirst({
    where: eq(user.id, userId),
    columns: { id: true, name: true, email: true, image: true },
  });

  const names = personalCard
    ? {
        firstName: personalCard.firstName,
        lastName: personalCard.lastName,
      }
    : splitName(account?.name);
  const firstName = names.firstName || 'Member';
  const lastName = names.lastName || null;

  const [inserted] = await db
    .insert(card)
    .values({
      firstName,
      lastName,
      email: personalCard?.email || account?.email || null,
      slug: `${slugify(`${firstName} ${lastName || ''}`.trim() || 'member')}-${nanoid()}`,
      position: personalCard?.position || 'Member',
      company: personalCard?.company || null,
      phone: personalCard?.phone || null,
      website: personalCard?.website || null,
      avatarUrl: personalCard?.avatarUrl || account?.image || null,
      socials: personalCard?.socials || [],
      userId,
      organizationId,
      splineUrl: setting.splineUrl || env.DEFAULT_SPLINE_URL,
      wallpaperUrl: setting.wallpaperUrl || env.DEFAULT_WALLPAPER_URL,
      cardBackUrl: setting.cardBackUrl || env.DEFAULT_CARD_BACK_URL,
    })
    .returning();

  if (!inserted) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create community card',
    });
  }

  return inserted;
}

export async function updateCommunityCardsBrand(
  organizationId: string,
  values: {
    splineUrl: string;
    wallpaperUrl: string;
    cardBackUrl: string;
  }
) {
  await db
    .update(card)
    .set({
      splineUrl: values.splineUrl,
      wallpaperUrl: values.wallpaperUrl,
      cardBackUrl: values.cardBackUrl,
    })
    .where(eq(card.organizationId, organizationId));
}

export async function deleteCommunityCardForUser(
  userId: string,
  organizationId: string
) {
  await db
    .delete(card)
    .where(and(eq(card.userId, userId), eq(card.organizationId, organizationId)));
}

async function findMembership(userId: string, organizationId: string) {
  const [row] = await db
    .select()
    .from(member)
    .where(
      and(eq(member.userId, userId), eq(member.organizationId, organizationId))
    )
    .limit(1);

  return row ?? null;
}

export async function addCommunityMember(userId: string, organizationId: string) {
  const existing = await findMembership(userId, organizationId);
  if (!existing) {
    await insertMember(userId, organizationId, 'member');
  }
  await ensureCommunityCard(userId, organizationId);
  return findMembership(userId, organizationId);
}

export async function removeCommunityMember(params: {
  memberId: string;
  organizationId: string;
}) {
  const [target] = await db
    .select()
    .from(member)
    .where(
      and(
        eq(member.id, params.memberId),
        eq(member.organizationId, params.organizationId)
      )
    )
    .limit(1);

  if (!target) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Member not found',
    });
  }

  if (target.role === 'owner') {
    const owners = await db
      .select({ id: member.id })
      .from(member)
      .where(
        and(
          eq(member.organizationId, params.organizationId),
          eq(member.role, 'owner')
        )
      );

    if (owners.length <= 1) {
      throw createError({
        statusCode: 400,
        statusMessage: 'The last owner cannot be removed from this community',
      });
    }
  }

  await deleteRegistrationsForUserInOrganization(
    target.userId,
    params.organizationId
  );
  await deleteCommunityCardForUser(target.userId, params.organizationId);
  await db.delete(member).where(eq(member.id, target.id));

  return target;
}

export async function listCommunityRoster(organizationId: string) {
  const memberRows = await db
    .select({
      member,
      user,
    })
    .from(member)
    .innerJoin(user, eq(user.id, member.userId))
    .where(eq(member.organizationId, organizationId));

  const userIds = memberRows.map((row) => row.user.id);
  const existingCards =
    userIds.length === 0
      ? []
      : await db
          .select()
          .from(card)
          .where(
            and(
              eq(card.organizationId, organizationId),
              inArray(card.userId, userIds)
            )
          );

  const cardByUserId = new Map(
    existingCards
      .filter((item) => item.userId)
      .map((item) => [item.userId as string, item])
  );

  const missingUserIds = userIds.filter((id) => !cardByUserId.has(id));
  await Promise.all(
    missingUserIds.map((id) => ensureCommunityCard(id, organizationId))
  );

  if (missingUserIds.length > 0) {
    const refreshed = await db
      .select()
      .from(card)
      .where(
        and(
          eq(card.organizationId, organizationId),
          inArray(card.userId, missingUserIds)
        )
      );
    for (const item of refreshed) {
      if (item.userId) cardByUserId.set(item.userId, item);
    }
  }

  const [checkInCounts, contactCounts] = await Promise.all([
    countCheckedInByUsersInOrganization(userIds, organizationId),
    countContactsByCardIds([...cardByUserId.values()].map((item) => item.id)),
  ]);

  const members: CommunityMember[] = memberRows.map((row) => {
    const communityCard = cardByUserId.get(row.user.id);
    const firstName =
      communityCard?.firstName || splitName(row.user.name).firstName || row.user.name;
    const lastName = communityCard?.lastName || splitName(row.user.name).lastName || null;

    return {
      id: row.member.id,
      kind: 'member' as const,
      name: displayName(firstName, lastName) || row.user.name,
      role:
        communityCard?.position ||
        (isOrganizationManagerRole(row.member.role)
          ? row.member.role
          : 'Member'),
      company: communityCard?.company || '',
      connections: communityCard
        ? (contactCounts.get(communityCard.id) ?? 0)
        : 0,
      eventsAttended: checkInCounts.get(row.user.id) ?? 0,
      status: 'active' as const,
      email: communityCard?.email || row.user.email,
      joinedAt: row.member.createdAt.toISOString(),
      avatarUrl: communityCard?.avatarUrl || row.user.image,
      cardSlug: communityCard?.slug || null,
      firstName,
      lastName,
      phone: communityCard?.phone || null,
      linkedin: linkedinFromSocials(communityCard?.socials),
    };
  });

  const invitationRows = await db
    .select()
    .from(invitation)
    .where(
      and(
        eq(invitation.organizationId, organizationId),
        eq(invitation.status, 'pending')
      )
    );

  const invitations: CommunityMember[] = invitationRows.map((row) => ({
    id: row.id,
    kind: 'invitation' as const,
    name: row.email,
    role: row.role || 'Member',
    company: '',
    connections: 0,
    eventsAttended: 0,
    status: 'pending' as const,
    email: row.email,
    joinedAt: row.createdAt.toISOString(),
    avatarUrl: null,
    cardSlug: null,
    firstName: null,
    lastName: null,
    phone: null,
    linkedin: null,
  }));

  return [...members, ...invitations];
}
