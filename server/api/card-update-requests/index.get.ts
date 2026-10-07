import { desc, eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import { card, cardUpdateRequest, user } from '~~/server/db/schema';
import { requireAdminSession } from '~~/server/utils/admin-permissions';

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);
  const status = String(getQuery(event).status || '');

  const query = db
    .select({
      id: cardUpdateRequest.id,
      firstName: cardUpdateRequest.firstName,
      lastName: cardUpdateRequest.lastName,
      position: cardUpdateRequest.position,
      phone: cardUpdateRequest.phone,
      email: cardUpdateRequest.email,
      website: cardUpdateRequest.website,
      note: cardUpdateRequest.note,
      status: cardUpdateRequest.status,
      cardId: cardUpdateRequest.cardId,
      cardSlug: card.slug,
      cardFirstName: card.firstName,
      cardLastName: card.lastName,
      cardPosition: card.position,
      cardPhone: card.phone,
      cardEmail: card.email,
      cardWebsite: card.website,
      requesterName: user.name,
      requesterEmail: user.email,
      createdAt: cardUpdateRequest.createdAt,
    })
    .from(cardUpdateRequest)
    .innerJoin(card, eq(card.id, cardUpdateRequest.cardId))
    .innerJoin(user, eq(user.id, cardUpdateRequest.requestedBy))
    .orderBy(desc(cardUpdateRequest.createdAt));

  if (!status) return query;
  return query.where(eq(cardUpdateRequest.status, status));
});
