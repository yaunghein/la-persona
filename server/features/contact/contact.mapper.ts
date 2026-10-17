import type { ContactRow } from '~~/server/features/contact/contact.repository';
import type {
  ContactSource,
  ContactSummary,
} from '~~/shared/contracts/contact';
import { normalizePhoneCountryCode } from '~~/shared/utils/phone';

function fullName(firstName: string | null, lastName: string | null) {
  return [firstName, lastName].filter(Boolean).join(' ').trim();
}

/**
 * Seamless contacts mirror the other member's live card, so edits they make
 * later show up here; other contacts are the snapshot captured at exchange.
 */
export function toContactSummary(row: ContactRow): ContactSummary {
  const { contact, personaCard } = row;
  const isLiveCard =
    contact.source === 'seamless_exchange' && personaCard?.id != null;

  const details = isLiveCard
    ? {
        name: fullName(personaCard.firstName, personaCard.lastName) || contact.name,
        phone: personaCard.phone?.trim() || '',
        phoneCountryCode: personaCard.phone?.trim()
          ? normalizePhoneCountryCode(personaCard.phoneCountryCode)
          : null,
        email: personaCard.email?.trim() || null,
        company: personaCard.company?.trim() || null,
        position: personaCard.position?.trim() || null,
      }
    : {
        name: contact.name,
        phone: contact.phone,
        phoneCountryCode: contact.phoneCountryCode,
        email: contact.email,
        company: contact.company,
        position: contact.position,
      };

  return {
    id: contact.id,
    ...details,
    source: contact.source as ContactSource,
    createdAt: contact.createdAt.toISOString(),
    card: row.card
      ? {
          id: row.card.id,
          slug: row.card.slug,
          name: fullName(row.card.firstName, row.card.lastName),
          organizationSlug: row.organizationSlug,
        }
      : null,
    personaCardSlug: isLiveCard ? (personaCard?.slug ?? null) : null,
  };
}
