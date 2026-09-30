import { and, desc, eq, ilike, inArray, or, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '~~/server/db';
import { card, contactExchange, organization } from '~~/server/db/schema';
import {
  loadWorkspaceCards,
  workspaceCardLabel,
} from '~~/server/services/workspace-cards';
import {
  hasOrganizationPermission,
  requireOrganizationPermission,
} from '~~/server/utils/organization-permissions';
import { ORGANIZATION_PERMISSIONS } from '~~/shared/permissions/organization';
import { normalizePhoneCountryCode } from '~~/shared/utils/phone';

const laPersonaCard = alias(card, 'la_persona_card');

function liveSeamlessContactFields(row: {
  source: string;
  name: string;
  phone: string;
  phoneCountryCode: string | null;
  email: string | null;
  company: string | null;
  position: string | null;
  liveCardId: string | null;
  liveFirstName: string | null;
  liveLastName: string | null;
  livePhone: string | null;
  livePhoneCountryCode: string | null;
  liveEmail: string | null;
  liveCompany: string | null;
  livePosition: string | null;
}) {
  const snapshot = {
    name: row.name,
    phone: row.phone,
    phoneCountryCode: row.phoneCountryCode,
    email: row.email,
    company: row.company,
    position: row.position,
  };

  if (row.source !== 'seamless_exchange' || !row.liveCardId) return snapshot;

  const phone = row.livePhone?.trim() || '';
  const name = [row.liveFirstName, row.liveLastName]
    .filter(Boolean)
    .join(' ')
    .trim();

  return {
    name: name || snapshot.name,
    phone,
    phoneCountryCode: phone
      ? normalizePhoneCountryCode(row.livePhoneCountryCode)
      : null,
    email: row.liveEmail?.trim() || null,
    company: row.liveCompany?.trim() || null,
    position: row.livePosition?.trim() || null,
  };
}

export default defineEventHandler(async (event) => {
  const session = await requireOrganizationPermission(
    event,
    ORGANIZATION_PERMISSIONS.CONTACT_EXCHANGE_READ
  );

  const { cardId, q, scope } = getQuery(event);
  const selectedCardId = typeof cardId === 'string' ? cardId : 'all';
  const searchQuery = typeof q === 'string' ? q.trim() : '';
  const orgId = session.session.activeOrganizationId;
  const userId = session.user.id;
  const isWorkspace = scope === 'workspace';

  const canReadAllContacts = await hasOrganizationPermission(
    event,
    ORGANIZATION_PERMISSIONS.CONTACT_EXCHANGE_READ_ALL,
    orgId
  );

  const workspaceCards = isWorkspace ? await loadWorkspaceCards(userId) : [];
  const workspaceCardIds = workspaceCards.map((item) => item.id);

  const conditions: SQL[] = [];

  if (isWorkspace) {
    if (
      selectedCardId !== 'all' &&
      !workspaceCardIds.includes(selectedCardId)
    ) {
      throw createError({
        statusCode: 403,
        statusMessage: 'You do not have access to this card contacts.',
      });
    }

    const scopedIds =
      selectedCardId === 'all' ? workspaceCardIds : [selectedCardId];
    conditions.push(
      scopedIds.length
        ? inArray(contactExchange.cardId, scopedIds)
        : eq(contactExchange.id, '')
    );
  } else {
    conditions.push(
      (canReadAllContacts
        ? eq(card.organizationId, orgId)
        : and(eq(card.organizationId, orgId), eq(card.userId, userId)))!
    );

    if (selectedCardId !== 'all') {
      const accessibleCard = await db.query.card.findFirst({
        where: and(
          eq(card.id, selectedCardId),
          eq(card.organizationId, orgId),
          ...(canReadAllContacts ? [] : [eq(card.userId, userId)])
        ),
        columns: { id: true },
      });

      if (!accessibleCard) {
        throw createError({
          statusCode: 403,
          statusMessage: 'You do not have access to this card contacts.',
        });
      }

      conditions.push(eq(contactExchange.cardId, selectedCardId));
    }
  }

  if (searchQuery) {
    conditions.push(
      or(
        ilike(contactExchange.name, `%${searchQuery}%`),
        ilike(contactExchange.phone, `%${searchQuery}%`),
        ilike(contactExchange.email, `%${searchQuery}%`),
        ilike(contactExchange.company, `%${searchQuery}%`),
        ilike(contactExchange.position, `%${searchQuery}%`),
        ilike(card.firstName, `%${searchQuery}%`),
        ilike(card.lastName, `%${searchQuery}%`),
        ilike(laPersonaCard.firstName, `%${searchQuery}%`),
        ilike(laPersonaCard.lastName, `%${searchQuery}%`),
        ilike(laPersonaCard.phone, `%${searchQuery}%`),
        ilike(laPersonaCard.email, `%${searchQuery}%`),
        ilike(laPersonaCard.company, `%${searchQuery}%`),
        ilike(laPersonaCard.position, `%${searchQuery}%`)
      )!
    );
  }

  const [contacts, ownerCardOptions] = await Promise.all([
    db
      .select({
        id: contactExchange.id,
        name: contactExchange.name,
        phone: contactExchange.phone,
        phoneCountryCode: contactExchange.phoneCountryCode,
        email: contactExchange.email,
        company: contactExchange.company,
        position: contactExchange.position,
        cardId: contactExchange.cardId,
        source: contactExchange.source,
        laPersonaUserId: contactExchange.laPersonaUserId,
        laPersonaCardId: contactExchange.laPersonaCardId,
        laPersonaCardSlug: laPersonaCard.slug,
        liveCardId: laPersonaCard.id,
        liveFirstName: laPersonaCard.firstName,
        liveLastName: laPersonaCard.lastName,
        livePhone: laPersonaCard.phone,
        livePhoneCountryCode: laPersonaCard.phoneCountryCode,
        liveEmail: laPersonaCard.email,
        liveCompany: laPersonaCard.company,
        livePosition: laPersonaCard.position,
        reciprocalExchangeId: contactExchange.reciprocalExchangeId,
        cardSlug: card.slug,
        cardFirstName: card.firstName,
        cardLastName: card.lastName,
        cardOrganizationSlug: organization.slug,
      })
      .from(contactExchange)
      .leftJoin(card, eq(contactExchange.cardId, card.id))
      .leftJoin(organization, eq(card.organizationId, organization.id))
      .leftJoin(
        laPersonaCard,
        eq(contactExchange.laPersonaCardId, laPersonaCard.id)
      )
      .where(and(...conditions))
      .orderBy(desc(contactExchange.createdAt)),
    !isWorkspace && canReadAllContacts
      ? db
          .select({
            id: card.id,
            firstName: card.firstName,
            lastName: card.lastName,
          })
          .from(card)
          .where(eq(card.organizationId, orgId))
      : Promise.resolve([]),
  ]);

  return {
    isOwner: canReadAllContacts,
    cards: isWorkspace
      ? workspaceCards.map((item) => ({
          id: item.id,
          label: workspaceCardLabel(item),
        }))
      : ownerCardOptions.map((item) => ({
          id: item.id,
          label: `${item.firstName} ${item.lastName || ''}`.trim(),
        })),
    contacts: contacts.map((row) => {
      const live = liveSeamlessContactFields(row);

      return {
        id: row.id,
        name: live.name,
        phone: live.phone,
        phoneCountryCode: live.phoneCountryCode,
        email: live.email,
        company: live.company,
        position: live.position,
        cardId: row.cardId,
        source: row.source,
        laPersonaUserId: row.laPersonaUserId,
        laPersonaCardId: row.laPersonaCardId,
        laPersonaCardSlug: row.laPersonaCardSlug,
        reciprocalExchangeId: row.reciprocalExchangeId,
        cardSlug: row.cardSlug,
        cardFirstName: row.cardFirstName,
        cardLastName: row.cardLastName,
        cardOrganizationSlug: row.cardOrganizationSlug,
      };
    }),
  };
});
