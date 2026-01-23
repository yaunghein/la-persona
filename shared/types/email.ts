import { z } from 'zod';

const baseEmailSchema = z.object({
  name: z.string().min(1),
  to: z.array(z.email()).min(1),
  subject: z.string().min(1),
});

const welcomeSchema = baseEmailSchema.extend({
  template: z.literal('Welcome'),
});

const contactExchangeSchema = baseEmailSchema.extend({
  template: z.literal('ContactExchange'),
  email: z.email(),
  phone: z.string().min(1),
  company: z.string().optional(),
  position: z.string().optional(),
});

export const emailSchema = z.discriminatedUnion('template', [
  welcomeSchema,
  contactExchangeSchema,
]);

export type EmailSchema = z.infer<typeof emailSchema>;
