import { asc } from 'drizzle-orm';
import { db } from '~~/server/db';
import { subscriptionPlan } from '~~/server/db/schema';
import { requireAdminSession } from '~~/server/utils/admin-permissions';

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);

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
