import { desc, eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import { cardRequest, user } from '~~/server/db/schema';
import { requireAdminSession } from '~~/server/utils/admin-permissions';

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);

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
