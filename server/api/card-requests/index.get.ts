import { desc, eq } from 'drizzle-orm';
import { auth } from '~~/server/auth';
import { db } from '~~/server/db';
import { cardRequest, user } from '~~/server/db/schema';

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers });
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  const rows = await db
    .select({
      id: cardRequest.id,
      type: cardRequest.type,
      status: cardRequest.status,
      paymentReceiptUrl: cardRequest.paymentReceiptUrl,
      cardData: cardRequest.cardData,
      requesterName: user.name,
      requesterEmail: user.email,
      createdAt: cardRequest.createdAt,
      updatedAt: cardRequest.updatedAt,
    })
    .from(cardRequest)
    .leftJoin(user, eq(user.id, cardRequest.userId))
    .orderBy(desc(cardRequest.createdAt));

  return rows.map((row) => ({
    ...row,
    cardData: row.cardData || {},
  }));
});
