import { quoteCardPaymentFor } from '~~/server/features/billing/billing.service';
import { authorizeCardAccess } from '~~/server/features/card/card.policy';
import { CardPaymentQuoteQuery } from '~~/shared/contracts/billing';
import { CardRouteParams } from '~~/shared/contracts/card';

/** What a renewal or premium upgrade of this card costs right now. */
export default defineEventHandler(async (event) => {
  const { cardSlug } = await parseRouteParams(event, CardRouteParams);
  const { card } = await authorizeCardAccess(event, cardSlug, 'card:read');
  const { kind } = await parseRequestQuery(event, CardPaymentQuoteQuery);
  return quoteCardPaymentFor(card, kind);
});
