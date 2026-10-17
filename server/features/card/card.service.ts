import {
  deleteCardWithPendingRequests,
  findCardWithContextBySlug,
  isCardSlugTaken,
  listCardsInOrganization,
  listWorkspaceCards,
  updateCardById,
  type CardWithContext,
} from '~~/server/features/card/card.repository';
import { toCardDetail } from '~~/server/features/card/card.mapper';
import type { Collection } from '~~/shared/contracts/collection';
import type { CardDetail, UpdateCardRequest } from '~~/shared/contracts/card';
import { ORGANIZATION_TYPES } from '~~/shared/utils/constants';
import { resolvedPhoneFields } from '~~/shared/utils/phone';

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
  changes: UpdateCardRequest
): Promise<CardDetail> {
  const values = { ...changes };

  if ('phone' in changes || 'phoneCountryCode' in changes) {
    const resolved = resolvedPhoneFields(
      changes.phone ?? target.card.phone,
      changes.phoneCountryCode ?? target.card.phoneCountryCode
    );
    values.phone = resolved.phone;
    values.phoneCountryCode = resolved.phoneCountryCode;
  }

  if (changes.slug && changes.slug !== target.card.slug) {
    if (await isCardSlugTaken(changes.slug, target.card.id)) {
      throw conflict(
        'That card URL is already taken. Please choose a different slug.',
        'card_slug_taken'
      );
    }
  }

  const updated = await updateCardById(target.card.id, values);
  if (!updated) throw notFound('Card');

  const refreshed = await findCardWithContextBySlug(updated.slug);
  if (!refreshed) throw notFound('Card');
  return toCardDetail(refreshed);
}

/** Card holders delete their own personal cards; community cards follow membership. */
export async function deleteCard(target: CardWithContext, actorUserId: string) {
  if (target.organization.type === ORGANIZATION_TYPES.COMMUNITY) {
    throw forbidden(
      'Community cards are removed when you leave the community.',
      'community_card'
    );
  }
  if (target.card.userId !== actorUserId) {
    throw forbidden('You can only delete your own cards.', 'not_card_holder');
  }
  await deleteCardWithPendingRequests(target.card.id, actorUserId);
}
