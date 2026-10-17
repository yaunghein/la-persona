import { describeCardSubscription } from '~~/server/features/billing/billing.service';
import { authorizeCardAccess } from '~~/server/features/card/card.policy';
import { CardRouteParams } from '~~/shared/contracts/card';

/** `null` for community cards, which have no subscription of their own. */
export default defineEventHandler(async (event) => {
  const { cardSlug } = await parseRouteParams(event, CardRouteParams);
  const { card } = await authorizeCardAccess(event, cardSlug, 'card:read');
  return describeCardSubscription(card);
});
