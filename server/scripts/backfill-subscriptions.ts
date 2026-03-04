import { db } from '../db';
import { card, cardSubscription, subscriptionPlan } from '../db/schema';

const TRIAL_DAYS = 30;

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

function addDays(base: Date, days: number) {
  const result = new Date(base);
  result.setDate(result.getDate() + days);
  return result;
}

async function main() {
  await db.insert(subscriptionPlan).values(defaultPlans).onConflictDoNothing();

  const cards = await db.query.card.findMany({
    columns: { id: true, createdAt: true },
  });

  const now = new Date();
  let inserted = 0;

  for (const row of cards) {
    const trialStartAt = row.createdAt;
    const trialEndAt = addDays(trialStartAt, TRIAL_DAYS);
    const status = trialEndAt > now ? 'trial' : 'expired';

    const result = await db
      .insert(cardSubscription)
      .values({
        cardId: row.id,
        status,
        isTrial: true,
        trialStartAt,
        trialEndAt,
        expiredAt: status === 'expired' ? now : null,
      })
      .onConflictDoNothing({ target: cardSubscription.cardId })
      .returning({ id: cardSubscription.id });

    if (result.length > 0) inserted += 1;
  }

  console.log(
    `[backfill-subscriptions] processed=${cards.length} inserted=${inserted}`
  );
}

main();
