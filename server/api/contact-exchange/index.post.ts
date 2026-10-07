import { insertContactExchange } from '~~/server/services/contact-exchange';
import { enrichLog } from '~~/server/utils/wide-event';

export default defineEventHandler(async (event) => {
  const result = await readValidatedBody(
    event,
    contactExchangeInsertSchema.safeParse
  );
  if (!result.success) {
    throw createError({
      statusCode: 400,
      data: result.error.issues,
    });
  }
  try {
    const inserted = await insertContactExchange(result.data);
    enrichLog(event, {
      contact_exchange: {
        card_id: inserted?.cardId,
        result: 'saved',
        ...(inserted?.email ? { email: inserted.email } : {}),
      },
    });
    return inserted;
  } catch (e) {
    handleApiError(e, {
      statusCode: 500,
      statusMessage: 'Failed to save contact',
    });
  }
});
