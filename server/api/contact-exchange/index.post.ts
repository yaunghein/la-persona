import { insertContactExchange } from '~~/server/services/contact-exchange';

export default defineEventHandler(async (event) => {
  const result = await readValidatedBody(
    event,
    ContactExchangeSchema.safeParse
  );
  if (!result.success) {
    throw createError({
      statusCode: 400,
      data: result.error.issues,
    });
  }
  try {
    return await insertContactExchange(result.data);
  } catch (e) {
    handleApiError(e, {
      statusCode: 500,
      statusMessage: 'Failed to save contact',
    });
  }
});
