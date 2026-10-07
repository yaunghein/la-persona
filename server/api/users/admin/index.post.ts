import { z } from 'zod';
import { auth } from '~~/server/auth';
import { requireAdminSession } from '~~/server/utils/admin-permissions';
import { handleApiError } from '~~/server/utils/errors';
import { enrichLog } from '~~/server/utils/wide-event';

const bodySchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email(),
  password: z.string().min(8).max(200),
  role: z.enum(['user', 'admin']).default('user'),
});

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);

  const parsed = await readValidatedBody(event, bodySchema.safeParse);
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation failed',
      data: parsed.error.issues.map((issue) => issue.path.join('.') || 'body'),
    });
  }

  try {
    const created = await auth.api.createUser({
      body: {
        name: parsed.data.name,
        email: parsed.data.email,
        password: parsed.data.password,
        role: parsed.data.role,
      },
      headers: event.headers,
    });

    enrichLog(event, {
      target_user: {
        id: created.user.id,
        email: created.user.email,
        role: parsed.data.role,
      },
    });

    return {
      id: created.user.id,
      name: created.user.name,
      email: created.user.email,
      role: created.user.role ?? parsed.data.role,
    };
  } catch (error) {
    const body =
      error && typeof error === 'object' && 'body' in error
        ? error.body
        : undefined;
    const message =
      body && typeof body === 'object' && body && 'message' in body
        ? String(body.message)
        : error instanceof Error
          ? error.message
          : '';
    if (/already exists/i.test(message)) {
      throw createError({
        statusCode: 409,
        statusMessage: 'A user with that email already exists',
      });
    }
    handleApiError(error, { statusMessage: 'Failed to create user' });
  }
});
