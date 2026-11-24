import { authorizeCardAccess } from '~~/server/features/card/card.policy';
import { updateCard } from '~~/server/features/card/card.service';
import { CardRouteParams, UpdateCardRequest } from '~~/shared/contracts/card';
import { ORGANIZATION_TYPES } from '~~/shared/utils/constants';

export default defineEventHandler(async (event) => {
  const { cardSlug } = await parseRouteParams(event, CardRouteParams);
  const access = await authorizeCardAccess(event, cardSlug, 'card:update');
  // Organizers read members' community cards; only the holder edits one.
  if (
    access.organization.type === ORGANIZATION_TYPES.COMMUNITY &&
    !access.isHolder
  ) {
    throw forbidden(
      'Only the card holder can edit this card.',
      'not_card_holder'
    );
  }
  const changes = await parseRequestBody(event, UpdateCardRequest);

  const updated = await updateCard(access.card, changes, {
    isCompanyManager: canAccessOrganization(access, 'card:readAll'),
  });
  if (changes.visibility)
    enrichLog(event, { card: { visibility: changes.visibility } });
  const card = access.card;
  if (updated.slug !== cardSlug)
    enrichLog(event, { card: { new_slug: updated.slug } });
  return updated;
});
