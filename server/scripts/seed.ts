import { seed } from 'drizzle-seed';
import { db } from '../db';
import * as schema from '../db/schema';

const defaultPlans = [
  {
    code: 'standard',
    name: 'Standard',
    billingCycle: 'yearly',
    priceMinor: 0,
    currency: 'MMK',
    isActive: true,
  },
  {
    code: 'premium',
    name: 'Premium',
    billingCycle: 'yearly',
    priceMinor: 0,
    currency: 'MMK',
    isActive: true,
  },
];

async function main() {
  const {
    cardSubscription: _cardSubscription,
    subscriptionPayment: _subscriptionPayment,
    subscriptionPaymentItem: _subscriptionPaymentItem,
    subscriptionPlan: _subscriptionPlan,
    onboardingInvitation: _onboardingInvitation,
    ...seedableSchema
  } = schema;

  await seed(db, seedableSchema);
  await db
    .insert(schema.subscriptionPlan)
    .values(defaultPlans)
    .onConflictDoNothing();
}

main();
