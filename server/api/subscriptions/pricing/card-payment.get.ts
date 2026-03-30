import { and, eq, inArray } from 'drizzle-orm';
import { db } from '~~/server/db';
import { subscriptionPlan } from '~~/server/db/schema';
import { env } from '~~/server/utils/env';
import { requireOrganizationSession } from '~~/server/utils/organization-permissions';

const REQUIRED_PLAN_CODES = ['standard', 'premium'] as const;

export default defineEventHandler(async (event) => {
  await requireOrganizationSession(event);

  const plans = await db
    .select({
      code: subscriptionPlan.code,
      priceMinor: subscriptionPlan.priceMinor,
      currency: subscriptionPlan.currency,
    })
    .from(subscriptionPlan)
    .where(
      and(
        inArray(subscriptionPlan.code, [...REQUIRED_PLAN_CODES]),
        eq(subscriptionPlan.isActive, true)
      )
    );

  const planByCode = new Map(plans.map((plan) => [plan.code, plan]));
  const standardPlan = planByCode.get('standard');
  const premiumPlan = planByCode.get('premium');

  if (!standardPlan || !premiumPlan) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Active standard/premium pricing is not configured.',
    });
  }

  return {
    currency: standardPlan.currency,
    standardPlanPriceMinor: standardPlan.priceMinor,
    premiumPlanPriceMinor: premiumPlan.priceMinor,
    customDesignFeeMinor: env.CUSTOM_DESIGN_FEE,
  };
});
