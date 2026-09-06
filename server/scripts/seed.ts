import { seed } from 'drizzle-seed';
import { db } from '../db';
import * as schema from '../db/schema';

// TODO: need to fine tune seeder

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

const TRIAL_DAYS = 30;

function addDays(base: Date, days: number) {
  const result = new Date(base);
  result.setDate(result.getDate() + days);
  return result;
}

async function main() {
  const {
    cardSubscription: _cardSubscription,
    subscriptionPayment: _subscriptionPayment,
    subscriptionPaymentItem: _subscriptionPaymentItem,
    subscriptionPlan: _subscriptionPlan,
    onboardingInvitation: _onboardingInvitation,
    ...seedableSchema
  } = schema;

  // drizzle-seed may generate duplicate card_id values for card_subscription.
  // Seed core entities first, then backfill subscriptions deterministically.
  await seed(db, seedableSchema);
  await db.insert(schema.subscriptionPlan).values(defaultPlans).onConflictDoNothing();

  const cards = await db.query.card.findMany({
    columns: { id: true, createdAt: true },
  });

  const now = new Date();
  const rows = cards.map((row) => {
    const trialStartAt = row.createdAt;
    const trialEndAt = addDays(trialStartAt, TRIAL_DAYS);
    const status = trialEndAt > now ? 'trial' : 'expired';

    return {
      cardId: row.id,
      status,
      isTrial: true,
      trialStartAt,
      trialEndAt,
      expiredAt: status === 'expired' ? now : null,
    } as const;
  });

  if (rows.length > 0) {
    await db
      .insert(schema.cardSubscription)
      .values(rows)
      .onConflictDoNothing({ target: schema.cardSubscription.cardId });
  }
}

main();
