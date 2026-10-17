import { findCardBySlug } from '~~/server/features/card/card.repository';
import {
  exchangeContactSeamlessly,
  exchangeContactViaForm,
} from '~~/server/features/contact/contact.service';
import {
  CreateContactExchangeRequest,
  type ContactExchangeResult,
} from '~~/shared/contracts/contact';
import { CardRouteParams } from '~~/shared/contracts/card';

/**
 * A visitor exchanges contact details with a card holder.
 * `form`: anonymous visitor fills the form. `seamless`: signed-in member swaps cards.
 */
export default defineEventHandler(async (event) => {
  const { cardSlug } = await parseRouteParams(event, CardRouteParams);
  const request = await parseRequestBody(event, CreateContactExchangeRequest);

  const ownerCard = await findCardBySlug(cardSlug);
  if (!ownerCard) throw notFound('Card');
  enrichLog(event, {
    contact_exchange: {
      card_id: ownerCard.id,
      card_slug: cardSlug,
      mode: request.mode,
    },
  });

  if (request.mode === 'form') {
    const { contactId, emails } = await exchangeContactViaForm(
      ownerCard,
      request
    );
    enrichLog(event, {
      contact_exchange: {
        id: contactId,
        result: 'saved',
        ...(request.email ? { email: request.email } : {}),
      },
      email: { attempted: emails.recipients.length > 0, to: emails.recipients },
    });
    trackEmailSends(event, emails.deliveries);
    return respondCreated<ContactExchangeResult>(
      event,
      `/api/contacts/${contactId}`,
      {
        mode: 'form',
        contactId,
      }
    );
  }

  const principal = requirePrincipal(event);
  const result = await exchangeContactSeamlessly(ownerCard, {
    userId: principal.user.id,
    email: principal.user.email,
  });
  enrichLog(event, {
    contact_exchange: {
      id: result.ownerContactId,
      visitor_card_id: result.visitorCardId,
      result: 'exchanged',
    },
    email: {
      attempted: result.emails.recipients.length > 0,
      to: result.emails.recipients,
    },
  });
  trackEmailSends(event, result.emails.deliveries);
  return respondCreated<ContactExchangeResult>(
    event,
    `/api/contacts/${result.visitorContactId}`,
    {
      mode: 'seamless',
      ownerContactId: result.ownerContactId,
      visitorContactId: result.visitorContactId,
    }
  );
});
