import { insertContactExchangeBeforePlatform } from '~~/server/services/contact-exchange';
import { enrichLog } from '~~/server/utils/wide-event';

export default defineEventHandler(async (event) => {
  const result = await readValidatedBody(
    event,
    legacyExchangeInsertSchema.safeParse
  );
  if (!result.success) {
    throw createError({
      statusCode: 400,
      data: result.error.issues,
    });
  }
  try {
    const inserted = await insertContactExchangeBeforePlatform(result.data);
    enrichLog(event, {
      contact_exchange: {
        result: 'saved',
        owner_email: inserted?.ownerEmail,
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
