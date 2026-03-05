import { asc } from 'drizzle-orm';
import { auth } from '~~/server/auth';
import { db } from '~~/server/db';
import { subscriptionPlan } from '~~/server/db/schema';

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers });
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  return await db
    .select({
      id: subscriptionPlan.id,
      code: subscriptionPlan.code,
      name: subscriptionPlan.name,
      billingCycle: subscriptionPlan.billingCycle,
      priceMinor: subscriptionPlan.priceMinor,
      currency: subscriptionPlan.currency,
      isActive: subscriptionPlan.isActive,
      createdAt: subscriptionPlan.createdAt,
      updatedAt: subscriptionPlan.updatedAt,
    })
    .from(subscriptionPlan)
    .orderBy(asc(subscriptionPlan.priceMinor));
});
