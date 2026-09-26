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

const laPersonaCard = alias(card, 'la_persona_card');

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
        ilike(card.lastName, `%${searchQuery}%`)
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
        reciprocalExchangeId: contactExchange.reciprocalExchangeId,
        cardSlug: card.slug,
        cardFirstName: card.firstName,
        cardLastName: card.lastName,
        cardOrganizationSlug: organization.slug,
      })
      .from(contactExchange)
      .leftJoin(card, eq(contactExchange.cardId, card.id))
      .leftJoin(organization, eq(card.organizationId, organization.id))
      .leftJoin(laPersonaCard, eq(contactExchange.laPersonaCardId, laPersonaCard.id))
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
    contacts,
  };
});
