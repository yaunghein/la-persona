import {
  findCardWithContextBySlug,
  isCardSlugTaken,
  listCardsInOrganization,
  listWorkspaceCards,
  removeCard,
  updateCardById,
  type CardWithContext,
} from '~~/server/features/card/card.repository';
import { toCardDetail } from '~~/server/features/card/card.mapper';
import type { Collection } from '~~/shared/contracts/collection';
import type { CardDetail, UpdateCardRequest } from '~~/shared/contracts/card';
import { isUniqueViolation } from '~~/server/lib/db-errors';
import { ORGANIZATION_TYPES } from '~~/shared/utils/constants';
import { resolvedPhoneFields } from '~~/shared/utils/phone';
import { effectiveSubscriptionStatus } from '~~/shared/utils/subscription';

/**
 * Whether a public card collects views, saves and contact exchanges. Expired
 * personal and company cards pause, a company card without a holder is
 * vacant, and community cards never pause.
 */
export function cardActivity(row: CardWithContext): 'ok' | 'paused' | 'vacant' {
  const type = row.organization.type;
  if (type === ORGANIZATION_TYPES.COMMUNITY) return 'ok';
  if (type === ORGANIZATION_TYPES.COMPANY && !row.card.userId) return 'vacant';
  const { subscription } = row;
  // Personal cards from before subscriptions have no row and stay live.
  if (!subscription?.status) {
    return type === ORGANIZATION_TYPES.COMPANY ? 'paused' : 'ok';
  }
  // A receipt awaiting review never revives an ended period. A new card
  // awaiting its first approval has no period yet and stays live.
  if (subscription.status === 'pending_approval') {
    const end =
      subscription.currentPeriodEndAt ??
      (subscription.isTrial ? subscription.trialEndAt : null);
    return end && end <= new Date() ? 'paused' : 'ok';
  }
  const status = effectiveSubscriptionStatus(
    subscription.status,
    subscription.trialEndAt,
    subscription.currentPeriodEndAt
  );
  return status === 'expired' ? 'paused' : 'ok';
}

export function assertCardLive(row: CardWithContext) {
  const activity = cardActivity(row);
  if (activity === 'paused') {
    throw conflict('This card is currently unavailable.', 'card_paused');
  }
  if (activity === 'vacant') {
    throw conflict('This card is not assigned.', 'card_vacant');
  }
}

/** Managers see every card in the organization; members only the cards they hold. */
export async function listOrganizationCards(
  organizationId: string,
  holderUserId: string | null
): Promise<Collection<CardDetail>> {
  const rows = await listCardsInOrganization(
    organizationId,
    holderUserId ?? undefined
  );
  return { items: rows.map(toCardDetail) };
}

export async function listCardsInWorkspace(
  userId: string
): Promise<Collection<CardDetail>> {
  const rows = await listWorkspaceCards(userId);
  return { items: rows.map(toCardDetail) };
}

export async function updateCard(
  target: CardWithContext,
  changes: UpdateCardRequest,
  options?: { isCompanyManager?: boolean }
): Promise<CardDetail> {
  const values = { ...changes };
  if (target.organization.type === ORGANIZATION_TYPES.COMPANY) {
    delete values.slug;
    if (!options?.isCompanyManager) {
      delete values.company;
      delete values.website;
      delete values.departmentId;
    }
  } else {
    delete values.departmentId;
  }
  if (values.departmentId) {
    const { listDepartments } =
      await import('~~/server/features/organization/company.service');
    const departments = await listDepartments(target.card.organizationId);
    if (!departments.items.some((item) => item.id === values.departmentId)) {
      throw badRequest('Choose a department from this company.');
    }
  }

  if ('phone' in changes || 'phoneCountryCode' in changes) {
    const resolved = resolvedPhoneFields(
      changes.phone ?? target.card.phone,
      changes.phoneCountryCode ?? target.card.phoneCountryCode
    );
    values.phone = resolved.phone;
    values.phoneCountryCode = resolved.phoneCountryCode;
  }

  const slugTaken = () =>
    conflict(
      'That card URL is already taken. Please choose a different slug.',
      'card_slug_taken'
    );
  if (changes.slug && changes.slug !== target.card.slug) {
    if (await isCardSlugTaken(changes.slug, target.card.id)) throw slugTaken();
  }

  // Someone may take the slug between the check and the write.
  const updated = await updateCardById(target.card.id, values).catch(
    (error: unknown) => {
      throw isUniqueViolation(error) ? slugTaken() : error;
    }
  );
  if (!updated) throw notFound('Card');

  const refreshed = await findCardWithContextBySlug(updated.slug);
  if (!refreshed) throw notFound('Card');
  return toCardDetail(refreshed);
}

/** Card holders remove their own personal cards; community cards follow membership. */
export async function deleteCard(target: CardWithContext, actorUserId: string) {
  if (
    target.organization.type === ORGANIZATION_TYPES.COMMUNITY ||
    target.organization.type === ORGANIZATION_TYPES.COMPANY
  ) {
    throw forbidden(
      'Community cards are removed when you leave the community.',
      'community_card'
    );
  }
  if (target.card.userId !== actorUserId) {
    throw forbidden('You can only delete your own cards.', 'not_card_holder');
  }
  // Soft-removed so the contacts collected on it stay in the owner's Contacts.
  await removeCard(target.card.id, actorUserId);
}
