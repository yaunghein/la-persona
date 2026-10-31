import type { H3Event } from 'h3';
import { auth } from '~~/server/auth';
import {
  findInvitationById,
  findMembership,
  findOrganizationById,
  findUserIdByEmail,
} from '~~/server/features/organization/community.repository';
import {
  communityHomePath,
  communityInviteStats,
  ensureCommunityCard,
  joinCommunity,
} from '~~/server/features/organization/community.service';
import type {
  CommunityInvitationPreview,
  CreateInvitationRequest,
  InvitationInvitee,
  InvitationReviewResult,
} from '~~/shared/contracts/organization';
import { isCommunityCardComplete } from '~~/shared/utils/event-flow';
import { ROUTES } from '~~/shared/utils/routes';
import {
  COMMUNITY_INVITE_ROLES,
  type CommunityInviteRole,
} from '~~/shared/permissions/organization';

type InvitationRecord = NonNullable<
  Awaited<ReturnType<typeof findInvitationById>>
>;

function inviteRole(invitation: InvitationRecord): CommunityInviteRole {
  return COMMUNITY_INVITE_ROLES.includes(invitation.role as CommunityInviteRole)
    ? (invitation.role as CommunityInviteRole)
    : 'member';
}

function isInvitee(invitation: InvitationRecord, email: string) {
  return invitation.email.toLowerCase() === email.toLowerCase();
}

function maskEmail(email: string) {
  const [local = '', domain = ''] = email.split('@');
  const masked =
    local.length <= 2
      ? `${local[0] ?? ''}*`
      : `${local[0]}${'*'.repeat(local.length - 2)}${local.at(-1)}`;
  return `${masked}@${domain}`;
}

function isOpen(invitation: InvitationRecord) {
  return (
    invitation.status === 'pending' &&
    invitation.expiresAt.getTime() >= Date.now()
  );
}

/** better-auth sends the email; resending replaces the pending invitation. */
export function sendInvitation(
  event: H3Event,
  organizationId: string,
  request: CreateInvitationRequest
) {
  return auth.api.createInvitation({
    body: {
      email: request.email,
      role: request.role,
      organizationId,
      resend: true,
    },
    headers: event.headers,
  });
}

async function loadInvitation(event: H3Event, invitationId: string) {
  const invitation = await findInvitationById(invitationId);
  if (!invitation) throw notFound('Invitation');
  enrichLog(event, {
    invitation: {
      id: invitation.id,
      organization_id: invitation.organizationId,
      email: invitation.email,
    },
  });
  return invitation;
}

/** Only the invited address can open an invitation. */
export async function previewInvitation(
  event: H3Event,
  invitationId: string,
  viewer: { userId: string; email: string }
): Promise<CommunityInvitationPreview> {
  const invitation = await loadInvitation(event, invitationId);
  if (!isInvitee(invitation, viewer.email)) {
    throw forbidden(
      `This invitation was sent to ${maskEmail(invitation.email)}.`,
      'not_invitee'
    );
  }
  const organization = await findOrganizationById(invitation.organizationId);
  if (!organization) throw notFound('Community');

  const [membership, stats] = await Promise.all([
    findMembership(viewer.userId, organization.id),
    communityInviteStats(organization.id),
  ]);
  return {
    id: invitation.id,
    email: invitation.email,
    organizationName: organization.name,
    organizationSlug: organization.slug,
    logoUrl: organization.logo,
    alreadyMember: !!membership,
    expired: invitation.expiresAt.getTime() < Date.now(),
    status: invitation.status,
    ...stats,
  };
}

export async function describeInvitationInvitee(
  event: H3Event,
  invitationId: string
): Promise<InvitationInvitee> {
  const invitation = await loadInvitation(event, invitationId);
  if (!isOpen(invitation)) throw notFound('Invitation');
  return { email: invitation.email };
}

/**
 * `accepted` by the invitee: join the community.
 * `accepted` by a manager: add the invitee directly if they already have an
 * account, otherwise send the invitation again.
 * `canceled` by a manager: withdraw it.
 */
export async function reviewInvitation(
  event: H3Event,
  invitationId: string,
  status: 'accepted' | 'canceled',
  viewer: { userId: string; email: string }
): Promise<InvitationReviewResult> {
  const invitation = await loadInvitation(event, invitationId);

  if (status === 'accepted' && isInvitee(invitation, viewer.email)) {
    return acceptAsInvitee(event, invitation, viewer.userId);
  }

  const permission =
    status === 'accepted' ? 'member:create' : 'invitation:cancel';
  await authorizeOrganizationAccessById(
    event,
    invitation.organizationId,
    permission
  );
  if (invitation.status !== 'pending') {
    throw conflict(
      'This invitation has already been processed.',
      'invitation_decided'
    );
  }
  // Admin invitations come from Thakhin; only the invitee can accept them.
  if (status === 'accepted' && invitation.role === 'admin') {
    throw forbidden(
      'Only the invited organizer can accept this invitation.',
      'owner_invitation'
    );
  }

  if (status === 'canceled') {
    await auth.api.cancelInvitation({
      body: { invitationId },
      headers: event.headers,
    });
    return { status: 'canceled' };
  }

  const accountId = await findUserIdByEmail(invitation.email);
  if (accountId) {
    await joinCommunity(
      accountId,
      invitation.organizationId,
      inviteRole(invitation)
    );
    await auth.api.cancelInvitation({
      body: { invitationId },
      headers: event.headers,
    });
    return { status: 'member_added' };
  }

  await sendInvitation(event, invitation.organizationId, {
    email: invitation.email,
    role: inviteRole(invitation),
  });
  return { status: 'invitation_resent' };
}

async function acceptAsInvitee(
  event: H3Event,
  invitation: InvitationRecord,
  userId: string
): Promise<InvitationReviewResult> {
  const organization = await findOrganizationById(invitation.organizationId);
  if (!organization) throw notFound('Community');

  const membership = await findMembership(userId, organization.id);
  if (!membership) {
    if (!isOpen(invitation)) {
      throw conflict(
        'This invitation has expired or was already processed.',
        'invitation_closed'
      );
    }
    await auth.api.acceptInvitation({
      body: { invitationId: invitation.id },
      headers: event.headers,
    });
  }

  const card = await ensureCommunityCard(userId, organization.id);
  return {
    status: 'accepted',
    organizationSlug: organization.slug,
    redirectTo: isCommunityCardComplete(card)
      ? communityHomePath(organization.slug)
      : ROUTES.COMMUNITY_SETUP.CARD(organization.slug, card.slug, {
          step: 'create-card',
        }),
  };
}
