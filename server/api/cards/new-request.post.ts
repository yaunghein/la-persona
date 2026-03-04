import { auth } from '~~/server/auth';
import { db } from '~~/server/db';
import { card, cardRequest } from '~~/server/db/schema';
import { and, eq } from 'drizzle-orm';

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
    if (body.data.type === 'existing_design') {
      const sourceCardId = body.data.cardData?.sourceCardId;
      if (!sourceCardId) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Please choose an existing card design.',
        });
      }

      const activeOrgId = session.session.activeOrganizationId;
      if (!activeOrgId) {
        throw createError({
          statusCode: 400,
          statusMessage: 'No active organization selected.',
        });
      }

      const sourceCard = await db.query.card.findFirst({
        where: and(eq(card.id, sourceCardId), eq(card.organizationId, activeOrgId)),
      });

      if (!sourceCard) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Selected card design is invalid.',
        });
      }
    }

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
