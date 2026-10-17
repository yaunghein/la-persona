import { nanoid } from 'nanoid';
import { env } from '~~/env';
import {
  findAdminCard,
  findPendingOnboardingInvitationForCard,
  insertAdminCard,
  listAdminCards,
  organizationExists,
  type AdminCardRow,
} from '~~/server/features/card/card-admin.repository';
import {
  deleteCardWithPendingRequests,
  updateCardById,
} from '~~/server/features/card/card.repository';
import { ensureCardTrialSubscription } from '~~/server/services/subscription';
import type {
  AdminCardDetail,
  AdminCardSummary,
  CreateAdminCardRequest,
  UpdateAdminCardRequest,
} from '~~/shared/contracts/card';
import type { Collection } from '~~/shared/contracts/collection';
import type { OrganizationType } from '~~/shared/utils/constants';
import { resolvedPhoneFields } from '~~/shared/utils/phone';
import { slugify } from '~~/shared/utils/slugify';
import { effectiveSubscriptionStatus } from '~~/shared/utils/subscription';

function toAdminCardSummary(row: AdminCardRow): AdminCardSummary {
  const { card, subscription } = row;
  return {
    id: card.id,
    slug: card.slug,
    firstName: card.firstName,
    lastName: card.lastName,
    position: card.position,
    company: card.company,
    phone: card.phone,
    phoneCountryCode: card.phoneCountryCode,
    email: card.email,
    website: card.website,
    splineUrl: card.splineUrl,
    avatarUrl: card.avatarUrl,
    wallpaperUrl: card.wallpaperUrl,
    cardBackUrl: card.cardBackUrl,
    organizationId: card.organizationId,
    organizationName: row.organizationName,
    organizationSlug: row.organizationSlug,
    organizationType: row.organizationType as OrganizationType | null,
    userId: card.userId,
    linkedUserEmail: row.linkedUserEmail,
    createdAt: card.createdAt.toISOString(),
    updatedAt: card.updatedAt.toISOString(),
    subscriptionStatus: subscription?.status
      ? effectiveSubscriptionStatus(
          subscription.status,
          subscription.trialEndAt,
          subscription.currentPeriodEndAt
        )
      : null,
    subscriptionPlanCode: subscription?.planCode ?? null,
    subscriptionEndAt:
      (subscription?.isTrial ? subscription.trialEndAt : subscription?.currentPeriodEndAt)?.toISOString() ??
      null,
  };
}

export async function listCardsForAdmin(filter: {
  claimed?: boolean;
}): Promise<Collection<AdminCardSummary>> {
  return { items: (await listAdminCards(filter)).map(toAdminCardSummary) };
}

export async function describeCardForAdmin(cardId: string): Promise<AdminCardDetail> {
  const row = await findAdminCard(cardId);
  if (!row) throw notFound('Card');
  const invitation = await findPendingOnboardingInvitationForCard(cardId);
  return {
    ...toAdminCardSummary(row),
    pendingInvitation: invitation
      ? { ...invitation, expiresAt: invitation.expiresAt.toISOString() }
      : null,
  };
}

async function assertOrganizationExists(organizationId: string) {
  if (!(await organizationExists(organizationId))) {
    throw badRequest('Organization not found.', 'organization_not_found');
  }
}

/** Unclaimed card, later handed to someone through an onboarding invitation. */
export async function createCardForAdmin(request: CreateAdminCardRequest) {
  const organizationId = request.organizationId || env.PLACEHOLDER_ORGANIZATION_ID;
  await assertOrganizationExists(organizationId);

  const firstName = request.firstName?.trim() || 'Card';
  const phone = resolvedPhoneFields(request.phone, request.phoneCountryCode);
  const created = await insertAdminCard({
    firstName,
    lastName: request.lastName,
    slug: `${slugify(firstName) || 'card'}-${nanoid(8)}`,
    position: request.position?.trim() || 'Professional',
    company: request.company,
    phone: phone.phone,
    phoneCountryCode: phone.phoneCountryCode,
    email: request.email,
    website: request.website ?? null,
    splineUrl: request.splineUrl ?? null,
    avatarUrl: request.avatarUrl ?? null,
    wallpaperUrl: request.wallpaperUrl ?? null,
    cardBackUrl: request.cardBackUrl ?? null,
    organizationId,
    userId: null,
  });
  if (!created) throw new Error('Card insert returned no row.');
  await ensureCardTrialSubscription(created.id, created.createdAt);
  return describeCardForAdmin(created.id);
}

export async function updateCardForAdmin(cardId: string, changes: UpdateAdminCardRequest) {
  const existing = await findAdminCard(cardId);
  if (!existing) throw notFound('Card');
  if (changes.organizationId) await assertOrganizationExists(changes.organizationId);

  const values = Object.fromEntries(
    Object.entries(changes).filter(([, value]) => value !== undefined)
  ) as UpdateAdminCardRequest;
  if (changes.phone !== undefined) {
    const phone = resolvedPhoneFields(changes.phone, changes.phoneCountryCode);
    values.phone = phone.phone;
    values.phoneCountryCode = phone.phoneCountryCode;
  }

  await updateCardById(cardId, values);
  return describeCardForAdmin(cardId);
}

export async function deleteCardForAdmin(cardId: string) {
  const existing = await findAdminCard(cardId);
  if (!existing) throw notFound('Card');
  await deleteCardWithPendingRequests(cardId);
  return existing.card;
}
