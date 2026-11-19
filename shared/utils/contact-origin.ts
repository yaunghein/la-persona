import type { ContactSummary } from '~~/shared/contracts/contact';
import { ORGANIZATION_TYPES } from '~~/shared/utils/constants';

/** Human label for where a contact came from (table, grid and CSV export). */
export function contactOriginLabel(
  contact: Pick<ContactSummary, 'source' | 'card' | 'event'>
): string {
  if (contact.source === 'manual') return 'Added Manually';
  if (contact.source === 'seamless_exchange') {
    if (contact.event) return contact.event.title;
    if (contact.card?.organizationType === ORGANIZATION_TYPES.COMMUNITY) {
      return contact.card.organizationName;
    }
    return 'Personal card';
  }
  return contact.card?.name
    ? `From ${contact.card.name}`
    : 'From Card Exchange';
}

/** Platform link to the card a form exchange came from. Manual and seamless stay plain text. */
export function contactOriginPath(contact: ContactSummary): string | undefined {
  if (contact.source !== 'public_form' || !contact.card) return undefined;
  return `/platform/${contact.card.organizationSlug}/cards/${contact.card.slug}`;
}
