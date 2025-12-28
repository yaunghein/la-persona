import { db } from '../db';
import { card } from '../db/schema';
import { findFreeCardByUserId } from '../db/queries/card';
import { env } from '../utils/env';
import type { User } from '../../shared/utils/type';

export const ensureUserHasFreeCard = async (user: User) => {
  const existing = await findFreeCardByUserId(user.id);
  if (existing) return existing;
  const values = {
    name: user.name,
    position: 'Please Edit Position',
    splineUrl: env.DEFAULT_SPLINE_URL,
    userId: user.id,
  };
  const [created] = await db.insert(card).values(values).returning();
  return created;
};
