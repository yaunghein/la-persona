import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { auth } from '~~/server/auth';
import { db } from '~~/server/db';
import { card, contactExchange } from '~~/server/db/schema';
import { handleApiError } from '~~/server/utils/errors';

const createManualContactSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  position: z.string().trim().min(1, 'Professional title / role is required'),
  company: z.string().trim().optional(),
  phone: z.string().trim().min(1, 'Phone number is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  cardId: z.string().optional(),
});

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers });
  if (!session) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    });
  }

  const body = await readValidatedBody(
    event,
    createManualContactSchema.safeParse
  );
  if (!body.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation failed',
      data: body.error.issues,
    });
  }

  try {
    const [inserted] = await db
      .insert(contactExchange)
      .values({
        name: `${body.data.firstName} ${body.data.lastName}`.trim(),
        phone: body.data.phone,
        email: body.data.email || null,
        position: body.data.position,
        company: body.data.company?.trim() || null,
        cardId: null,
      })
      .returning();

    return inserted;
  } catch (error) {
    handleApiError(error, {
      statusCode: 500,
      statusMessage: 'Failed to create contact',
    });
  }
});
