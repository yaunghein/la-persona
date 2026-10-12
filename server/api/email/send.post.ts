import { requireAdminSession } from '~~/server/utils/admin-permissions';
import { enrichLog } from '~~/server/utils/wide-event';
import { contactsUrl } from '~~/server/utils/contact-exchange-email';

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
    const html = await renderEmailComponent(
      template,
      template === 'ContactExchange'
        ? { ...payload, contactsUrl: contactsUrl() }
        : payload
    );
    const response = await sendEmail({ ...result.data, html });
    return { success: true, data: response };
  } catch (error) {
    return handleApiError(error);
  }
});
