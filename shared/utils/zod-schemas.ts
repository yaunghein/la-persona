import { z } from 'zod';

export const ContactExchangeSchema = z.object({
  name: z.string().nonempty().min(1),
  phone: z.string().nonempty().min(1),
  email: z.email().optional(),
  position: z.string().optional(),
  cardId: z.string().nonempty().min(1),
});
