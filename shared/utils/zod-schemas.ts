import { z } from 'zod';

export const ContactExchangeSchema = z.object({
  name: z.string().nonempty().min(1),
  phone: z.string().nonempty().min(1),
  email: z.email().optional(),
  position: z.string().optional(),
  cardId: z.string().nonempty().min(1),
});

export const UpdateCardSchema = z.object({
  id: z.string(),
  name: z.string().min(1).optional(),
  position: z.string().min(1).optional(),
  splineUrl: z.string().url().nullable().optional(),
  type: z.enum(['free', 'premium']).optional(),
});
