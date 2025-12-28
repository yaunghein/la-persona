export default defineEventHandler(async (event) => {
  const result = await readValidatedBody(event, emailSchema.safeParse);
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid body parameters',
      data: result.error.issues,
    });
  }
  try {
    const response = await sendEmail(result.data);
    return {
      success: true,
      data: response,
    };
  } catch (error) {
    handleApiError(error, {
      statusCode: 500,
      statusMessage: 'Failed to send email',
    });
  }
});

// await new Promise((r) => setTimeout(r, 3000));
// throw new Error('test hehe');
// return { success: true };
