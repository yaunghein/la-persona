import type { H3Event } from 'h3';
import { findCardWithContextBySlug } from '~~/server/features/card/card.repository';
import type { OrganizationPermissionKey } from '~~/shared/permissions/organization';

/**
 * A card belongs to its organization. Managers (`card:readAll`) reach every
 * card there; everyone else only the cards they hold. Cards the caller cannot
 * reach are reported as not found.
 */
export async function authorizeCardAccess(
  event: H3Event,
  cardSlug: string,
  permission: OrganizationPermissionKey
) {
  const card = await findCardWithContextBySlug(cardSlug);
  if (!card) throw notFound('Card');

  const access = await authorizeOrganizationAccessById(
    event,
    card.card.organizationId,
    permission
  );
  const isHolder = card.card.userId === access.principal.user.id;
  if (!isHolder && !canAccessOrganization(access, 'card:readAll')) {
    throw notFound('Card');
  }

  enrichLog(event, { card: { id: card.card.id, slug: card.card.slug } });
  return { card, isHolder, ...access };
}
