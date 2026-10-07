import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '~~/server/db';
import { user } from '~~/server/db/schema';
import { requireAdminSession } from '~~/server/utils/admin-permissions';
import { enrichLog } from '~~/server/utils/wide-event';

const bodySchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    role: z.enum(['user', 'admin']).optional(),
    banned: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.role !== undefined ||
      value.banned !== undefined,
    {
      message: 'name, role, or banned',
      path: ['name'],
    }
  );

export default defineEventHandler(async (event) => {
  const adminSession = await requireAdminSession(event);
  const userId = getRouterParam(event, 'id');
  if (!userId) {
    throw createError({ statusCode: 400, statusMessage: 'User id is required' });
  }

  const parsed = await readValidatedBody(event, bodySchema.safeParse);
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation failed',
      data: parsed.error.issues.map((issue) => issue.path.join('.') || 'body'),
    });
  }

  if (
    userId === adminSession.user.id &&
    (parsed.data.role !== undefined || parsed.data.banned !== undefined)
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: 'You cannot change your own role or ban state',
    });
  }

  const existing = await db.query.user.findFirst({
    where: eq(user.id, userId),
    columns: { id: true, name: true, email: true, role: true, banned: true },
  });
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' });
  }

  const changed: string[] = [];
  if (parsed.data.name !== undefined && parsed.data.name !== existing.name) {
    changed.push('name');
  }
  if (parsed.data.role !== undefined && parsed.data.role !== existing.role) {
    changed.push('role');
  }
  if (
    parsed.data.banned !== undefined &&
    parsed.data.banned !== Boolean(existing.banned)
  ) {
    changed.push('banned');
  }

  const [updated] = await db
    .update(user)
    .set({
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.role !== undefined ? { role: parsed.data.role } : {}),
      ...(parsed.data.banned !== undefined ? { banned: parsed.data.banned } : {}),
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId))
    .returning({
      id: user.id,
      email: user.email,
      role: user.role,
      banned: user.banned,
    });

  enrichLog(event, {
    target_user: {
      id: existing.id,
      email: existing.email,
      changed,
    },
  });

  return updated;
});
