import { and, desc, eq, ilike, isNull, or } from 'drizzle-orm';
import { auth } from '~~/server/auth';
import { db } from '~~/server/db';
import { card, contactExchange, member } from '~~/server/db/schema';

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({
    headers: event.headers,
  });
  if (!session || !session.session.activeOrganizationId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    });
  }

  const { cardId, q } = getQuery(event);
  const selectedCardId = typeof cardId === 'string' ? cardId : 'all';
  const searchQuery = typeof q === 'string' ? q.trim() : '';
  const orgId = session.session.activeOrganizationId;
  const userId = session.user.id;

  const userMemberInfo = await db.query.member.findFirst({
    where: and(eq(member.organizationId, orgId), eq(member.userId, userId)),
  });
  if (!userMemberInfo) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' });
  }
  const isOwner = userMemberInfo.role === 'owner';

  const conditions = [
    isOwner
      ? or(eq(card.organizationId, orgId), isNull(contactExchange.cardId))
      : or(
          and(eq(card.organizationId, orgId), eq(card.userId, userId)),
          isNull(contactExchange.cardId)
        ),
  ];

  if (selectedCardId !== 'all') {
    const accessibleCard = await db.query.card.findFirst({
      where: and(
        eq(card.id, selectedCardId),
        eq(card.organizationId, orgId),
        ...(isOwner ? [] : [eq(card.userId, userId)])
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
        email: contactExchange.email,
        company: contactExchange.company,
        position: contactExchange.position,
        cardId: contactExchange.cardId,
        cardSlug: card.slug,
        cardFirstName: card.firstName,
        cardLastName: card.lastName,
      })
      .from(contactExchange)
      .leftJoin(card, eq(contactExchange.cardId, card.id))
      .where(and(...conditions))
      .orderBy(desc(contactExchange.createdAt)),
    isOwner
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
    isOwner,
    cards: ownerCardOptions.map((item) => ({
      id: item.id,
      label: `${item.firstName} ${item.lastName || ''}`.trim(),
    })),
    contacts,
  };
});
