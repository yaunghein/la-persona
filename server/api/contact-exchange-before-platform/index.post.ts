import { insertContactExchangeBeforePlatform } from '~~/server/services/contact-exchange';

export default defineEventHandler(async (event) => {
  const result = await readValidatedBody(
    event,
    ContactExchangeBeforePlatformSchema.safeParse
  );
  console.log(result);
  if (!result.success) {
    throw createError({
      statusCode: 400,
      data: result.error.issues,
    });
  }
  try {
    return await insertContactExchangeBeforePlatform(result.data);
  } catch (e) {
    handleApiError(e, {
      statusCode: 500,
      statusMessage: 'Failed to save contact',
    });
  }
});
