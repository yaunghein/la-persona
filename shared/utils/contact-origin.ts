import type { ContactSummary } from '~~/shared/contracts/contact';

/** Human label for where a contact came from (table, grid and CSV export). */
export function contactOriginLabel(
  contact: Pick<ContactSummary, 'source' | 'card'>
): string {
  if (contact.source === 'seamless_exchange') return 'Seamless Exchange';
  if (contact.source === 'manual') return 'Added Manually';
  return contact.card?.name
    ? `From ${contact.card.name}`
    : 'From Card Exchange';
}

/** Platform link to the card the contact was exchanged with (not for seamless). */
export function contactOriginPath(contact: ContactSummary): string | undefined {
  if (contact.source === 'seamless_exchange' || !contact.card) return undefined;
  return `/platform/${contact.card.organizationSlug}/cards/${contact.card.slug}`;
}
