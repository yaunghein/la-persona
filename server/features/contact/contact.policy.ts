import type { H3Event } from 'h3';
import { findContactLabel } from '~~/server/features/contact/contact-label.repository';
import { findContactOwnership } from '~~/server/features/contact/contact.repository';
import type { OrganizationAccess } from '~~/server/utils/authorization';
import type { OrganizationPermissionKey } from '~~/shared/permissions/organization';

/**
 * A contact belongs to the organization of the card it was exchanged with.
 * Managers (`contactExchange:readAll`) reach every card's contacts; members
 * only those of cards they hold. Anything else is reported as not found.
 */
export async function authorizeContactAccess(
  event: H3Event,
  contactId: string,
  permission: OrganizationPermissionKey
) {
  const contact = await findContactOwnership(contactId);
  if (!contact) throw notFound('Contact');

  const access = await authorizeOrganizationAccessById(
    event,
    contact.cardOrganizationId,
    permission
  );
  const isCardHolder = contact.cardUserId === access.principal.user.id;
  if (
    !isCardHolder &&
    !canAccessOrganization(access, 'contactExchange:readAll')
  ) {
    throw notFound('Contact');
  }
  enrichLog(event, { contact: { id: contact.id, card_id: contact.cardId } });
  return { contact, ...access };
}

/** Contact labels are private to their owner; anyone else gets "not found". */
export async function authorizeContactLabelAccess(
  event: H3Event,
  labelId: string
) {
  const principal = requirePrincipal(event);
  const label = await findContactLabel(labelId);
  if (!label || label.userId !== principal.user.id) throw notFound('Label');
  enrichLog(event, { label: { id: label.id } });
  return { label, principal };
}

/** `null` when the caller may see every card's contacts, else their own user id. */
export function contactOwnerScope(
  access: Pick<OrganizationAccess, 'principal' | 'membership'>
) {
  return canAccessOrganization(access, 'contactExchange:readAll')
    ? null
    : access.principal.user.id;
}
