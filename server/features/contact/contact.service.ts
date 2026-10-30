import {
  findCardOwnerEmail,
  findLatestCardInOrganization,
  listWorkspaceCards,
  type CardRecord,
} from '~~/server/features/card/card.repository';
import {
  insertContact,
  insertLegacyContactExchange,
  listContacts,
  upsertSeamlessExchange,
  type ContactScope,
} from '~~/server/features/contact/contact.repository';
import { toContactSummary } from '~~/server/features/contact/contact.mapper';
import {
  sendContactExchangeEmail,
  type ExchangedContact,
} from '~~/server/features/contact/contact.notifications';
import { toCsv } from '~~/server/lib/csv';
import type { EmailSendResult } from '~~/server/utils/wide-event';
import type { Page } from '~~/shared/contracts/collection';
import type {
  ContactSummary,
  CreateContactExchangeRequest,
  CreateLegacyContactExchangeRequest,
  CreateManualContactRequest,
  ListContactsQuery,
} from '~~/shared/contracts/contact';
import { cards as legacyCards } from '~~/shared/utils/cards';
import { contactOriginLabel } from '~~/shared/utils/contact-origin';
import { ORGANIZATION_TYPES } from '~~/shared/utils/constants';
import {
  internationalPhone,
  normalizePhoneCountryCode,
  resolvedPhoneFields,
} from '~~/shared/utils/phone';

type FormExchangeInput = Extract<
  CreateContactExchangeRequest,
  { mode: 'form' }
>;

/** Emails continue after the response; the handler tracks them on the wide event. */
export type EmailDeliveries = {
  recipients: string[];
  deliveries: Promise<EmailSendResult[]>;
};

function cardHolderName(value: Pick<CardRecord, 'firstName' | 'lastName'>) {
  return [value.firstName, value.lastName].filter(Boolean).join(' ').trim();
}

function cardAsExchangedContact(
  value: CardRecord,
  fallbackEmail: string | null
): ExchangedContact {
  return {
    name: cardHolderName(value),
    email: value.email || fallbackEmail || '',
    phone: value.phone
      ? internationalPhone(value.phone, value.phoneCountryCode)
      : '',
    company: value.company || '',
    position: value.position || '',
  };
}

function deliverContactExchangeEmails(
  sends: { to: string | null | undefined; contact: ExchangedContact }[]
): EmailDeliveries {
  const addressed = sends.filter(
    (send): send is { to: string; contact: ExchangedContact } => !!send.to
  );
  return {
    recipients: addressed.map((send) => send.to),
    deliveries: Promise.all(addressed.map(sendContactExchangeEmail)),
  };
}

export async function listContactPage(
  scope: ContactScope,
  query: ListContactsQuery
): Promise<Page<ContactSummary>> {
  const { rows, total } = await listContacts(scope, query);
  return {
    items: rows.map(toContactSummary),
    total,
    limit: query.limit,
    offset: query.offset,
  };
}

/** Managers see every card's contacts; members only their own cards'. */
export function organizationContactScope(
  organizationId: string,
  ownerUserId: string | null
): ContactScope {
  return ownerUserId
    ? { organizationId, cardOwnerUserId: ownerUserId }
    : { organizationId };
}

/** Every card the user holds across personal and community workspaces. */
export async function workspaceContactScope(
  userId: string
): Promise<ContactScope> {
  const workspaceCards = await listWorkspaceCards(userId);
  return { cardIds: workspaceCards.map((row) => row.card.id) };
}

/** Upper bound for one export; far above any real workspace today. */
const CONTACT_EXPORT_LIMIT = 10_000;

export async function exportContactsCsv(
  scope: ContactScope,
  query: Omit<ListContactsQuery, 'limit' | 'offset'>,
  options: { includeOrigin: boolean }
) {
  const { items } = await listContactPage(scope, {
    ...query,
    limit: CONTACT_EXPORT_LIMIT,
    offset: 0,
  });
  const header = ['Name', 'Role', 'Company', 'Phone', 'Email'];
  return toCsv([
    options.includeOrigin ? [...header, 'Origin'] : header,
    ...items.map((contact) => {
      const row = [
        contact.name,
        contact.position,
        contact.company,
        contact.phone,
        contact.email,
      ];
      return options.includeOrigin
        ? [...row, contactOriginLabel(contact)]
        : row;
    }),
  ]);
}

export async function createManualContact(params: {
  organizationId: string;
  ownerUserId: string | null;
  input: CreateManualContactRequest;
}) {
  const targetCard = await findLatestCardInOrganization(
    params.organizationId,
    params.ownerUserId ?? undefined
  );
  if (!targetCard) {
    throw conflict(
      'Create a card in this workspace before adding contacts.',
      'card_required'
    );
  }

  const { input } = params;
  const phoneFields = resolvedPhoneFields(input.phone, input.phoneCountryCode);
  return insertContact({
    name: `${input.firstName} ${input.lastName}`.trim(),
    phone: phoneFields.phone || input.phone,
    phoneCountryCode: phoneFields.phoneCountryCode,
    email: input.email || null,
    position: input.position,
    company: input.company || null,
    cardId: targetCard.id,
    source: 'manual',
  });
}

/**
 * A visitor fills the public form on a card: save the contact for the card,
 * email the card holder the visitor's details and, when the visitor left an
 * email, send them the card holder's details.
 */
export async function exchangeContactViaForm(
  ownerCard: CardRecord,
  input: FormExchangeInput
) {
  const phone = input.phone.trim();
  const saved = await insertContact({
    cardId: ownerCard.id,
    source: 'public_form',
    name: input.name,
    phone,
    phoneCountryCode: phone
      ? normalizePhoneCountryCode(input.phoneCountryCode)
      : null,
    email: input.email || null,
    company: input.company || null,
    position: input.position || null,
  });

  const ownerAccountEmail = await findCardOwnerEmail(ownerCard.id);
  const visitor: ExchangedContact = {
    name: input.name,
    email: input.email || '',
    phone: phone ? internationalPhone(phone, input.phoneCountryCode) : '',
    company: input.company || '',
    position: input.position || '',
  };

  return {
    contactId: saved.id,
    emails: deliverContactExchangeEmails([
      { to: ownerCard.email || ownerAccountEmail, contact: visitor },
      {
        to: input.email,
        contact: cardAsExchangedContact(ownerCard, ownerAccountEmail),
      },
    ]),
  };
}

/**
 * The card a visitor shares: their card in the owner's community, else their
 * personal card. Several personal cards need `cardId` to pick one.
 */
async function resolveVisitorCard(
  ownerCard: CardRecord,
  visitor: { userId: string; cardId?: string }
) {
  const rows = await listWorkspaceCards(visitor.userId);
  const communityCard = rows.find(
    (row) =>
      row.organization.type === ORGANIZATION_TYPES.COMMUNITY &&
      row.card.organizationId === ownerCard.organizationId
  );
  if (communityCard) return communityCard.card;

  const personalCards = rows
    .filter((row) => row.organization.type === ORGANIZATION_TYPES.PERSONAL)
    .map((row) => row.card);
  if (visitor.cardId) {
    const chosen = personalCards.find((item) => item.id === visitor.cardId);
    if (!chosen) throw notFound('Card');
    return chosen;
  }
  if (personalCards.length === 1) return personalCards[0]!;
  if (personalCards.length === 0) {
    throw conflict(
      'Create your La Persona card before using Seamless Exchange.',
      'card_required'
    );
  }
  throw conflict('Choose which card to share.', 'card_choice_required');
}

/** A signed-in member swaps cards with the card holder; both get each other. */
export async function exchangeContactSeamlessly(
  ownerCard: CardRecord,
  visitor: { userId: string; email: string; cardId?: string }
) {
  if (!ownerCard.userId) {
    throw conflict(
      'This card is not linked to a La Persona account yet.',
      'card_unclaimed'
    );
  }
  if (ownerCard.userId === visitor.userId) {
    throw badRequest(
      'You cannot exchange contact with your own card.',
      'own_card'
    );
  }

  const visitorCard = await resolveVisitorCard(ownerCard, visitor);

  const toSide = (holderCard: CardRecord, contactCard: CardRecord) => ({
    cardId: holderCard.id,
    name: cardHolderName(contactCard),
    phone: contactCard.phone || '',
    phoneCountryCode: contactCard.phone
      ? normalizePhoneCountryCode(contactCard.phoneCountryCode)
      : null,
    email: contactCard.email || null,
    company: contactCard.company || null,
    position: contactCard.position || null,
    laPersonaUserId: contactCard.userId,
    laPersonaCardId: contactCard.id,
  });

  const { ownerContactId, visitorContactId } = await upsertSeamlessExchange(
    toSide(ownerCard, visitorCard),
    toSide(visitorCard, ownerCard)
  );

  const ownerEmail =
    (await findCardOwnerEmail(ownerCard.id)) || ownerCard.email || '';
  const visitorEmail = visitor.email || visitorCard.email || '';

  return {
    ownerContactId,
    visitorContactId,
    visitorCardId: visitorCard.id,
    emails: deliverContactExchangeEmails([
      {
        to: ownerEmail,
        contact: cardAsExchangedContact(visitorCard, visitorEmail),
      },
      {
        to: visitorEmail,
        contact: cardAsExchangedContact(ownerCard, ownerEmail),
      },
    ]),
  };
}

/** Pre-platform static cards keep their own table; the owner email comes from the card, never the client. */
export async function exchangeContactWithLegacyCard(
  legacyCardId: string,
  input: CreateLegacyContactExchangeRequest
) {
  const legacyCard = legacyCards.find((item) => item.id === legacyCardId);
  if (!legacyCard) throw notFound('Card');

  const saved = await insertLegacyContactExchange({
    name: input.name,
    phone: input.phone,
    email: input.email || '',
    company: input.company || null,
    position: input.position || null,
    ownerEmail: legacyCard.email,
  });

  return {
    contactId: saved.id,
    ownerEmail: legacyCard.email,
    emails: deliverContactExchangeEmails([
      {
        to: legacyCard.email,
        contact: {
          name: input.name,
          email: input.email || '',
          phone: input.phone,
          company: input.company || '',
          position: input.position || '',
        },
      },
      {
        to: input.email,
        contact: {
          name: legacyCard.name,
          email: legacyCard.email,
          phone: legacyCard.phone,
          company: '',
          position: '',
        },
      },
    ]),
  };
}
