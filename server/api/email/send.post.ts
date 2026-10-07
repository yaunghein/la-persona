import { requireAdminSession } from '~~/server/utils/admin-permissions';
import { enrichLog } from '~~/server/utils/wide-event';

export default defineEventHandler(async (event) => {
  const result = await readValidatedBody(event, emailSchema.safeParse);
  if (!result.success) {
    throw createError({
      statusCode: 400,
      data: result.error.issues.map((issue) => issue.path.join('.') || 'body'),
    });
  }

  if (result.data.template !== 'ContactExchange') {
    await requireAdminSession(event);
  }

  try {
    const { template, ...payload } = result.data;
    enrichLog(event, {
      email: { template, to: result.data.to, attempted: true },
    });
    const html = await renderEmailComponent(template, payload);
    const response = await sendEmail({ ...result.data, html });
    return { success: true, data: response };
  } catch (error) {
    return handleApiError(error);
  }
});
