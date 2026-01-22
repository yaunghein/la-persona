import { z } from 'zod';
import { db } from '~~/server/db';
import {
  contactExchange,
  contactExchangeBeforePlatform,
} from '~~/server/db/schema';
import { InsertContactExchange, InsertLegacyExchange } from '~~/shared/types';

export const insertContactExchange = async (contact: InsertContactExchange) => {
  const [inserted] = await db
    .insert(contactExchange)
    .values(contact)
    .returning();
  return inserted;
};

export const insertContactExchangeBeforePlatform = async (
  contact: InsertLegacyExchange
) => {
  const [inserted] = await db
    .insert(contactExchangeBeforePlatform)
    .values(contact)
    .returning();
  return inserted;
};
