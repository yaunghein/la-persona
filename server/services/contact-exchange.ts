import { z } from 'zod';
import { db } from '~~/server/db';
import {
  contactExchange,
  contactExchangeBeforePlatform,
} from '~~/server/db/schema';
import { InsertContactExchange, InsertLegacyExchange } from '~~/shared/types';
import { normalizePhoneCountryCode } from '~~/shared/utils/phone';

export const insertContactExchange = async (contact: InsertContactExchange) => {
  const phone = contact.phone.trim();
  const [inserted] = await db
    .insert(contactExchange)
    .values({
      ...contact,
      phone,
      phoneCountryCode: phone
        ? normalizePhoneCountryCode(contact.phoneCountryCode)
        : null,
    })
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
