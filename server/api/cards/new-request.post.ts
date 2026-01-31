import { auth } from '~~/server/auth';
import { db } from '~~/server/db';
import { cardRequest } from '~~/server/db/schema';

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers });

  if (!session) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    });
  }

  const body = await readValidatedBody(
    event,
    cardRequestInsertSchema.safeParse
  );
  console.log(JSON.stringify(body, null, 2));

  if (!body.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation failed',
      data: body.error.issues,
    });
  }

  try {
    const [inserted] = await db
      .insert(cardRequest)
      .values({
        type: body.data.type,
        cardData: body.data.cardData,
        paymentReceiptUrl: body.data.paymentReceiptUrl,
        userId: session.user.id,
        status: 'pending',
      })
      .returning();

    return inserted;
  } catch (e) {
    console.error(e);
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
    });
  }
});
