import { date, pgTable, primaryKey, text } from 'drizzle-orm/pg-core';
import { user } from './auth';

export const userDailyActivity = pgTable(
  'user_daily_activity',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    day: date('day').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.day] }),
  ]
);
