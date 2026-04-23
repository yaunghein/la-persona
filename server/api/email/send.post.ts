// import { requireAdminSession } from '~~/server/utils/admin-permissions';

export default defineEventHandler(async (event) => {
  // await requireAdminSession(event);

  const result = await readValidatedBody(event, emailSchema.safeParse);
  if (!result.success) {
    throw createError({
      statusCode: 400,
      data: result.error.issues,
    });
  }

  try {
    const { template, ...payload } = result.data;
    const html = await renderEmailComponent(template, payload);
    const response = await sendEmail({ ...result.data, html });
    return { success: true, data: response };
  } catch (error) {
    return handleApiError(error);
  }
});
