import { z } from 'zod';
import { StoredImageReference } from '~~/shared/contracts/card';
import {
  COMMUNITY_INVITE_ROLES,
  type OrganizationMemberRole,
} from '~~/shared/permissions/organization';
import type { OrganizationType } from '~~/shared/utils/constants';

export const OrganizationRouteParams = z.object({
  orgSlug: z.string().trim().min(1),
});

export const MemberRouteParams = z.object({
  memberId: z.string().trim().min(1),
});

export const InvitationRouteParams = z.object({
  invitationId: z.string().trim().min(1),
});

export const JoinLinkRouteParams = z.object({
  token: z.string().trim().min(1).max(64),
});

/** An organization the signed-in user belongs to, with their role in it. */
export type UserOrganization = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  type: OrganizationType;
  role: OrganizationMemberRole;
};

// ── Members ─────────────────────────────────────────────────────────────────

export type CommunityMemberStatus = 'active' | 'pending';

/** A roster row: an active member, or a pending email invitation. */
export type CommunityMember = {
  id: string;
  kind: 'member' | 'invitation';
  name: string;
  /** Card job title (or the org role for managers without a title). */
  role: string;
  company: string;
  connections: number;
  eventsAttended: number;
  status: CommunityMemberStatus;
  /** Org role (owner/admin/member/volunteer). */
  memberRole: OrganizationMemberRole;
  email?: string | null;
  /** UTC ISO string; format it in the browser. */
  joinedAt: string;
  avatarUrl?: string | null;
  cardSlug?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  linkedin?: string | null;
};

export const UpdateMemberRequest = z.object({
  role: z.enum(COMMUNITY_INVITE_ROLES),
});

export type UpdateMemberRequest = z.infer<typeof UpdateMemberRequest>;

// ── Invitations ─────────────────────────────────────────────────────────────

export const CreateInvitationRequest = z.object({
  email: z.email('A valid email is required').trim().toLowerCase(),
  role: z.enum(COMMUNITY_INVITE_ROLES).default('member'),
});

export type CreateInvitationRequest = z.infer<typeof CreateInvitationRequest>;

/**
 * `accepted`: the invitee joins, or a manager adds an invitee who already has
 * an account. `canceled`: a manager withdraws the invitation.
 */
export const ReviewInvitationRequest = z.object({
  status: z.enum(['accepted', 'canceled']),
});

export type ReviewInvitationRequest = z.infer<typeof ReviewInvitationRequest>;

export type InvitationReviewResult =
  | { status: 'accepted'; organizationSlug: string; redirectTo: string }
  | { status: 'member_added' }
  | { status: 'invitation_resent' }
  | { status: 'canceled' };

export type CommunityInviteStats = {
  coverUrl: string | null;
  memberCount: number;
  eventCount: number;
  foundedYear: number;
};

export type CommunityInvitationPreview = CommunityInviteStats & {
  id: string;
  email: string;
  organizationName: string;
  organizationSlug: string;
  logoUrl: string | null;
  alreadyMember: boolean;
  expired: boolean;
  status: string;
};

// ── Join links ──────────────────────────────────────────────────────────────

export type JoinLink = {
  url: string;
  expiresAt: string | null;
};

/** What anyone holding a join link can see, signed in or not. */
export type JoinLinkPreview = CommunityInviteStats & {
  organizationName: string;
  organizationSlug: string;
  logoUrl: string | null;
  /** Only known when the visitor is signed in. */
  alreadyMember: boolean | null;
};

export type MembershipResult = {
  organizationSlug: string;
  redirectTo: string;
};

// ── Community profile (settings + about) ────────────────────────────────────

export type CommunitySettingsFormValues = {
  name: string;
  description: string;
  guidelines: string;
  whyJoin: string;
  coverImageUrl: string;
  logoUrl: string;
  splineUrl: string;
  wallpaperUrl: string;
  cardBackUrl: string;
};

/** Community-branded email artwork; only Thakhin edits these. */
export type CommunityEmailImages = {
  emailQrBackgroundUrl: string;
  emailContactExchangeUrl: string;
  emailAfterEventUrl: string;
};

export type CommunitySettings = CommunitySettingsFormValues &
  CommunityEmailImages;

const richText = z.string().max(20_000);

/** Rich-text fields are sanitized on the server before they are stored. */
export const UpdateCommunitySettingsRequest = z.object({
  name: z.string().trim().min(1, 'Organization name cannot be empty.').max(120),
  description: richText,
  guidelines: richText,
  whyJoin: richText,
  logoUrl: StoredImageReference,
  coverImageUrl: StoredImageReference,
});

export type UpdateCommunitySettingsRequest = z.infer<
  typeof UpdateCommunitySettingsRequest
>;

export type CommunityAbout = CommunitySettings & {
  memberCount: number;
  eventCount: number;
  foundedYear: number;
  organizerCardSlug: string | null;
};

export function toCommunitySettings(params: {
  name: string;
  logo?: string | null;
  coverUrl?: string | null;
  description?: string | null;
  guidelines?: string | null;
  whyJoin?: string | null;
  splineUrl?: string | null;
  wallpaperUrl?: string | null;
  cardBackUrl?: string | null;
  emailQrBackgroundUrl?: string | null;
  emailContactExchangeUrl?: string | null;
  emailAfterEventUrl?: string | null;
}): CommunitySettings {
  return {
    name: params.name,
    logoUrl: params.logo?.trim() || '',
    coverImageUrl: params.coverUrl?.trim() || '',
    description: params.description ?? '',
    guidelines: params.guidelines ?? '',
    whyJoin: params.whyJoin ?? '',
    splineUrl: params.splineUrl?.trim() || '',
    wallpaperUrl: params.wallpaperUrl?.trim() || '',
    cardBackUrl: params.cardBackUrl?.trim() || '',
    emailQrBackgroundUrl: params.emailQrBackgroundUrl?.trim() || '',
    emailContactExchangeUrl: params.emailContactExchangeUrl?.trim() || '',
    emailAfterEventUrl: params.emailAfterEventUrl?.trim() || '',
  };
}

/** Data the members page renders (page-owned copy + server roster). */
export type CommunityMembersData = {
  title: string;
  searchPlaceholder: string;
  inviteLink: string;
  statusOptions: { label: string; value: string }[];
  participationOptions: { label: string; value: string }[];
  infoItems: { icon: string; title: string; description: string }[];
  members: CommunityMember[];
};
