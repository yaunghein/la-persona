import { z } from 'zod';
import { db } from '~~/server/db';
import { contactExchange } from '~~/server/db/schema';

export const insertContactExchange = async (
  contact: z.infer<typeof ContactExchangeSchema>
) => {
  const [inserted] = await db
    .insert(contactExchange)
    .values(contact)
    .returning();
  return inserted;
};
