import { z } from 'zod';
import { db } from '~~/server/db';
import {
  contactExchange,
  contactExchangeBeforePlatform,
} from '~~/server/db/schema';

export const insertContactExchange = async (
  contact: z.infer<typeof ContactExchangeSchema>
) => {
  const [inserted] = await db
    .insert(contactExchange)
    .values(contact)
    .returning();
  return inserted;
};

export const insertContactExchangeBeforePlatform = async (
  contact: z.infer<typeof ContactExchangeBeforePlatformSchema>
) => {
  const [inserted] = await db
    .insert(contactExchangeBeforePlatform)
    .values(contact)
    .returning();
  return inserted;
};
