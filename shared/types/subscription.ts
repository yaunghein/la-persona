import { z } from 'zod';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod';
import {
  cardSubscription,
  subscriptionPayment,
  subscriptionPaymentItem,
  subscriptionPlan,
} from '~~/server/db/schema';

export type SelectSubscriptionPlan = InferSelectModel<typeof subscriptionPlan>;
export type InsertSubscriptionPlan = InferInsertModel<typeof subscriptionPlan>;

export type SelectSubscriptionPayment = InferSelectModel<typeof subscriptionPayment>;
export type InsertSubscriptionPayment = InferInsertModel<typeof subscriptionPayment>;

export type SelectSubscriptionPaymentItem = InferSelectModel<
  typeof subscriptionPaymentItem
>;
export type InsertSubscriptionPaymentItem = InferInsertModel<
  typeof subscriptionPaymentItem
>;

export type SelectCardSubscription = InferSelectModel<typeof cardSubscription>;
export type InsertCardSubscription = InferInsertModel<typeof cardSubscription>;

export const subscriptionPlanSelectSchema = createSelectSchema(subscriptionPlan);
export const subscriptionPlanInsertSchema = createInsertSchema(subscriptionPlan);
export const subscriptionPlanUpdateSchema = createUpdateSchema(subscriptionPlan);

export const subscriptionPaymentSelectSchema = createSelectSchema(subscriptionPayment);
export const subscriptionPaymentInsertSchema = createInsertSchema(subscriptionPayment);
export const subscriptionPaymentUpdateSchema = createUpdateSchema(subscriptionPayment);

export const subscriptionPaymentItemSelectSchema =
  createSelectSchema(subscriptionPaymentItem);
export const subscriptionPaymentItemInsertSchema =
  createInsertSchema(subscriptionPaymentItem);
export const subscriptionPaymentItemUpdateSchema =
  createUpdateSchema(subscriptionPaymentItem);

export const cardSubscriptionSelectSchema = createSelectSchema(cardSubscription);
export const cardSubscriptionInsertSchema = createInsertSchema(cardSubscription);
export const cardSubscriptionUpdateSchema = createUpdateSchema(cardSubscription);

const textStatus = (
  allowed: string[],
  message = 'Invalid status value'
) =>
  z
    .string()
    .trim()
    .min(1)
    .refine((value) => allowed.includes(value), { message });

export const createSubscriptionPaymentLineSchema = z.object({
  cardId: z.string().trim().min(1),
  planCode: z.string().trim().min(1),
  termYears: z.coerce.number().int().positive().default(1),
  startAt: z.coerce.date().optional(),
  endAt: z.coerce.date().optional(),
  amountMinor: z.coerce.number().int().min(0).optional(),
  additionalFeeMinor: z.coerce.number().int().min(0).optional(),
  skipPeriodUpdate: z.boolean().optional(),
  currency: z.string().trim().min(3).optional(),
});

export const createSubscriptionPaymentBodySchema = z.object({
  receiptUrl: z.string().trim().min(1),
  paymentReference: z.string().trim().optional(),
  paymentMethod: z.string().trim().optional(),
  note: z.string().trim().optional(),
  items: z.array(createSubscriptionPaymentLineSchema).min(1),
  createPremiumRequest: z.boolean().optional(),
  status: textStatus(['submitted', 'pending_approval']).optional(),
});

export const approveSubscriptionPaymentBodySchema = z.object({
  note: z.string().trim().optional(),
  status: textStatus(['approved']).optional(),
});

export const rejectSubscriptionPaymentBodySchema = z.object({
  note: z.string().trim().optional(),
  reason: z.string().trim().max(4000).optional(),
});
