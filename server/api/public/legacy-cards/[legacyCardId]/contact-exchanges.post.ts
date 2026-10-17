import { exchangeContactWithLegacyCard } from '~~/server/features/contact/contact.service';
import {
  CreateLegacyContactExchangeRequest,
  LegacyCardRouteParams,
} from '~~/shared/contracts/contact';

/** Contact form on the pre-platform static cards (`/:legacyCardId`). */
export default defineEventHandler(async (event) => {
  const { legacyCardId } = await parseRouteParams(event, LegacyCardRouteParams);
  const request = await parseRequestBody(
    event,
    CreateLegacyContactExchangeRequest
  );

  const { contactId, ownerEmail, emails } = await exchangeContactWithLegacyCard(
    legacyCardId,
    request
  );
  enrichLog(event, {
    contact_exchange: {
      id: contactId,
      legacy_card_id: legacyCardId,
      owner_email: ownerEmail,
      result: 'saved',
      ...(request.email ? { email: request.email } : {}),
    },
    email: { attempted: emails.recipients.length > 0, to: emails.recipients },
  });
  trackEmailSends(event, emails.deliveries);
  return respondCreated(event, `/api/public/legacy-cards/${legacyCardId}`, {
    contactId,
  });
});
