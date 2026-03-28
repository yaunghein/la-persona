import { asc, eq, isNull } from 'drizzle-orm';
import { db } from '~~/server/db';
import { card, subscriptionPlan } from '~~/server/db/schema';
import { requireAdminSession } from '~~/server/utils/admin-permissions';

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);

  const [cards, plans] = await Promise.all([
    db
      .select({
        id: card.id,
        firstName: card.firstName,
        lastName: card.lastName,
        position: card.position,
      })
      .from(card)
      .where(isNull(card.userId))
      .orderBy(asc(card.firstName), asc(card.lastName)),
    db
      .select({
        code: subscriptionPlan.code,
        name: subscriptionPlan.name,
      })
      .from(subscriptionPlan)
      .where(eq(subscriptionPlan.isActive, true))
      .orderBy(asc(subscriptionPlan.priceMinor)),
  ]);

  return {
    cards: cards.map((item) => ({
      id: item.id,
      label: `${item.firstName} ${item.lastName || ''}`.trim(),
      subtitle: item.position || '',
    })),
    plans,
  };
});
