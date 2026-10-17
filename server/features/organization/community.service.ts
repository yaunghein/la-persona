import { nanoid } from 'nanoid';
import { env } from '~~/env';
import { countContactsByCardIds } from '~~/server/features/contact/contact.repository';
import {
  countCheckedInByUsersInOrganization,
  deleteRegistrationsForUserInOrganization,
} from '~~/server/features/event/registration.repository';
import {
  countMembersAndEvents,
  countOwners,
  deleteMemberWithCommunityData,
  findMemberInOrganization,
  findMembership,
  findOrganizationById,
  findOrganizerCardSlug,
  findPersonalCardOfUser,
  findUserAccount,
  findUserCardInOrganization,
  insertCard,
  insertMember,
  listCardsOfUsersInOrganization,
  listPendingInvitations,
  listRosterMembers,
  listUserOrganizations,
  updateOrganizationProfile,
} from '~~/server/features/organization/community.repository';
import {
  ensureCommunitySetting,
  findCommunitySettingByInviteToken,
  rotateInviteToken,
  upsertCommunitySettingByOrganizationId,
} from '~~/server/features/organization/community-setting.repository';
import { sanitizeRichText } from '~~/server/lib/html-sanitizer';
import { splitPersonName } from '~~/shared/utils/person-name';
import type { Collection } from '~~/shared/contracts/collection';
import type {
  CommunityAbout,
  CommunityInviteStats,
  CommunityMember,
  CommunitySettings,
  JoinLink,
  JoinLinkPreview,
  MembershipResult,
  UpdateCommunitySettingsRequest,
  UserOrganization,
} from '~~/shared/contracts/organization';
import { toCommunitySettings } from '~~/shared/contracts/organization';
import {
  isOrganizationManagerRole,
  type CommunityInviteRole,
  type OrganizationMemberRole,
} from '~~/shared/permissions/organization';
import {
  ORGANIZATION_TYPES,
  type OrganizationType,
} from '~~/shared/utils/constants';
import { ROUTES } from '~~/shared/utils/routes';
import { slugify } from '~~/shared/utils/slugify';

export function communityHomePath(organizationSlug: string) {
  return `${ROUTES.PLATFORM.ROOT}/${organizationSlug}`;
}

export function joinLinkUrl(token: string) {
  return `${env.BASE_URL}${ROUTES.INVITE.COMMUNITY_JOIN(token)}`;
}

export function invitationUrl(invitationId: string) {
  return `${env.BASE_URL}${ROUTES.INVITE.COMMUNITY_ACCEPT(invitationId)}`;
}

export async function listOrganizationsOfUser(
  userId: string
): Promise<Collection<UserOrganization>> {
  const rows = await listUserOrganizations(userId);
  return {
    items: rows.map((row) => ({
      ...row,
      type: row.type as OrganizationType,
      role: row.role as OrganizationMemberRole,
    })),
  };
}

export async function communityInviteStats(
  organizationId: string
): Promise<CommunityInviteStats> {
  const [organization, setting, counts] = await Promise.all([
    findOrganizationById(organizationId),
    ensureCommunitySetting(organizationId),
    countMembersAndEvents(organizationId),
  ]);
  return {
    coverUrl: setting?.coverUrl ?? null,
    ...counts,
    foundedYear: (organization?.createdAt ?? new Date()).getFullYear(),
  };
}

/**
 * Every community member holds a community card, branded with the
 * community's design and seeded from their personal card.
 */
export async function ensureCommunityCard(
  userId: string,
  organizationId: string
) {
  const existing = await findUserCardInOrganization(userId, organizationId);
  if (existing) return existing;

  const setting = await ensureCommunitySetting(organizationId);
  const [personalCard, account] = await Promise.all([
    findPersonalCardOfUser(userId),
    findUserAccount(userId),
  ]);

  const names = personalCard
    ? { firstName: personalCard.firstName, lastName: personalCard.lastName }
    : splitPersonName(account?.name);
  const firstName = names.firstName || 'Member';
  const lastName = names.lastName || null;

  const inserted = await insertCard({
    firstName,
    lastName,
    email: personalCard?.email || account?.email || null,
    slug: `${slugify(`${firstName} ${lastName || ''}`.trim() || 'member')}-${nanoid()}`,
    position: personalCard?.position || 'Member',
    company: personalCard?.company || null,
    phone: personalCard?.phone || null,
    phoneCountryCode: personalCard?.phoneCountryCode || null,
    website: personalCard?.website || null,
    avatarUrl: personalCard?.avatarUrl || account?.image || null,
    socials: personalCard?.socials || [],
    userId,
    organizationId,
    splineUrl: setting?.splineUrl || env.DEFAULT_SPLINE_URL,
    wallpaperUrl: setting?.wallpaperUrl || env.DEFAULT_WALLPAPER_URL,
    cardBackUrl: setting?.cardBackUrl || env.DEFAULT_CARD_BACK_URL,
  });
  if (!inserted) throw new Error('Community card insert returned no row.');
  return inserted;
}

/** Adds the user (idempotent) and makes sure they hold a community card. */
export async function joinCommunity(
  userId: string,
  organizationId: string,
  role: CommunityInviteRole = 'member'
) {
  const membership =
    (await findMembership(userId, organizationId)) ??
    (await insertMember(userId, organizationId, role));
  await ensureCommunityCard(userId, organizationId);
  return membership;
}

/**
 * Removes a member with their community card and registrations. Only owners
 * may remove an owner, and the last owner always stays.
 */
export async function removeMember(params: {
  memberId: string;
  organizationId: string;
  actorRole: string;
}) {
  const target = await findMemberInOrganization(
    params.memberId,
    params.organizationId
  );
  if (!target) throw notFound('Member');

  if (target.role === 'owner') {
    if (params.actorRole !== 'owner') {
      throw forbidden(
        'Only an owner can remove another owner.',
        'owner_protected'
      );
    }
    if ((await countOwners(params.organizationId)) <= 1) {
      throw conflict(
        'The last owner cannot be removed from this community.',
        'last_owner'
      );
    }
  }

  await deleteRegistrationsForUserInOrganization(
    target.userId,
    params.organizationId
  );
  await deleteMemberWithCommunityData({
    memberId: target.id,
    userId: target.userId,
    organizationId: params.organizationId,
  });
  return target;
}

/** Managers keep their role; only member and volunteer can be switched here. */
export async function assertMemberRoleChangeable(
  memberId: string,
  organizationId: string
) {
  const target = await findMemberInOrganization(memberId, organizationId);
  if (!target) throw notFound('Member');
  if (isOrganizationManagerRole(target.role)) {
    throw forbidden(
      'Owner and admin roles cannot be changed here.',
      'manager_role_locked'
    );
  }
  return target;
}

function linkedinFromSocials(
  socials: { label: string; value: string }[] | null | undefined
) {
  return (
    socials?.find((item) => item.label.toLowerCase().includes('linkedin'))
      ?.value || null
  );
}

function fullName(firstName: string, lastName?: string | null) {
  return [firstName, lastName].filter(Boolean).join(' ').trim();
}

/** Active members with their card, connections and attendance, plus pending invitations. */
export async function listCommunityRoster(
  organizationId: string
): Promise<Collection<CommunityMember>> {
  const rows = await listRosterMembers(organizationId);
  const userIds = rows.map((row) => row.user.id);
  const cards = await listCardsOfUsersInOrganization(userIds, organizationId);
  const cardByUserId = new Map(
    cards
      .filter((item) => item.userId)
      .map((item) => [item.userId as string, item])
  );

  const [checkIns, connections, invitations] = await Promise.all([
    countCheckedInByUsersInOrganization(userIds, organizationId),
    countContactsByCardIds([...cardByUserId.values()].map((item) => item.id)),
    listPendingInvitations(organizationId),
  ]);

  const members: CommunityMember[] = rows.map((row) => {
    const communityCard = cardByUserId.get(row.user.id);
    const fallbackName = splitPersonName(row.user.name);
    const firstName =
      communityCard?.firstName || fallbackName.firstName || row.user.name;
    const lastName = communityCard?.lastName || fallbackName.lastName || null;
    return {
      id: row.member.id,
      kind: 'member',
      name: fullName(firstName, lastName) || row.user.name,
      role:
        communityCard?.position ||
        (isOrganizationManagerRole(row.member.role)
          ? row.member.role
          : 'Member'),
      company: communityCard?.company || '',
      connections: communityCard ? (connections.get(communityCard.id) ?? 0) : 0,
      eventsAttended: checkIns.get(row.user.id) ?? 0,
      status: 'active',
      memberRole: row.member.role as OrganizationMemberRole,
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

  const pending: CommunityMember[] = invitations.map((row) => ({
    id: row.id,
    kind: 'invitation',
    name: row.email,
    role: row.role || 'Member',
    company: '',
    connections: 0,
    eventsAttended: 0,
    status: 'pending',
    memberRole: (row.role || 'member') as OrganizationMemberRole,
    email: row.email,
    joinedAt: row.createdAt.toISOString(),
    avatarUrl: null,
    cardSlug: null,
    firstName: null,
    lastName: null,
    phone: null,
    linkedin: null,
  }));

  return { items: [...members, ...pending] };
}

// ── Join links ──────────────────────────────────────────────────────────────

export async function describeJoinLink(
  organizationId: string
): Promise<JoinLink> {
  const setting = await ensureCommunitySetting(organizationId);
  return {
    url: setting ? joinLinkUrl(setting.inviteToken) : '',
    expiresAt: setting?.inviteTokenExpiresAt?.toISOString() ?? null,
  };
}

export async function issueNewJoinLink(
  organizationId: string
): Promise<JoinLink> {
  await ensureCommunitySetting(organizationId);
  const setting = await rotateInviteToken(organizationId);
  if (!setting) throw notFound('Community');
  return {
    url: joinLinkUrl(setting.inviteToken),
    expiresAt: setting.inviteTokenExpiresAt?.toISOString() ?? null,
  };
}

/** The community behind a live join link; expired or unknown tokens are not found. */
async function resolveJoinLink(token: string) {
  const setting = await findCommunitySettingByInviteToken(token);
  const isExpired =
    !setting?.inviteTokenExpiresAt ||
    setting.inviteTokenExpiresAt.getTime() < Date.now();
  if (!setting || isExpired) throw notFound('Invite link');

  const organization = await findOrganizationById(setting.organizationId);
  if (!organization || organization.type !== ORGANIZATION_TYPES.COMMUNITY) {
    throw notFound('Community');
  }
  return organization;
}

export async function previewJoinLink(
  token: string,
  viewerUserId: string | null
): Promise<JoinLinkPreview> {
  const organization = await resolveJoinLink(token);
  const [stats, membership] = await Promise.all([
    communityInviteStats(organization.id),
    viewerUserId ? findMembership(viewerUserId, organization.id) : null,
  ]);
  return {
    organizationName: organization.name,
    organizationSlug: organization.slug,
    logoUrl: organization.logo,
    alreadyMember: viewerUserId ? !!membership : null,
    ...stats,
  };
}

export async function joinCommunityWithLink(
  token: string,
  userId: string
): Promise<MembershipResult & { organizationId: string }> {
  const organization = await resolveJoinLink(token);
  await joinCommunity(userId, organization.id);
  return {
    organizationId: organization.id,
    organizationSlug: organization.slug,
    redirectTo: communityHomePath(organization.slug),
  };
}

// ── Profile (settings + about) ──────────────────────────────────────────────

export async function describeCommunitySettings(
  organizationId: string
): Promise<CommunitySettings> {
  const [organization, setting] = await Promise.all([
    findOrganizationById(organizationId),
    ensureCommunitySetting(organizationId),
  ]);
  if (!organization || !setting) throw notFound('Community');
  return toCommunitySettings({
    ...setting,
    name: organization.name,
    logo: organization.logo,
  });
}

/** Rich text is sanitized on write, so every renderer can trust stored HTML. */
export async function updateCommunitySettings(
  organizationId: string,
  changes: UpdateCommunitySettingsRequest
): Promise<CommunitySettings> {
  const organization = await updateOrganizationProfile(organizationId, {
    name: changes.name,
    logo: changes.logoUrl,
  });
  if (!organization) throw notFound('Community');

  const setting = await upsertCommunitySettingByOrganizationId(organizationId, {
    description: sanitizeRichText(changes.description) ?? '',
    guidelines: sanitizeRichText(changes.guidelines) ?? '',
    whyJoin: sanitizeRichText(changes.whyJoin) ?? '',
    coverUrl: changes.coverImageUrl,
  });
  if (!setting) throw notFound('Community');
  return toCommunitySettings({
    ...setting,
    name: organization.name,
    logo: organization.logo,
  });
}

export async function describeCommunityAbout(
  organizationId: string
): Promise<CommunityAbout> {
  const [settings, counts, organization, organizerCardSlug] = await Promise.all(
    [
      describeCommunitySettings(organizationId),
      countMembersAndEvents(organizationId),
      findOrganizationById(organizationId),
      findOrganizerCardSlug(organizationId),
    ]
  );
  return {
    ...settings,
    ...counts,
    foundedYear: (organization?.createdAt ?? new Date()).getFullYear(),
    organizerCardSlug,
  };
}
