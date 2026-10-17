import { z } from 'zod';

/** Landing page "join the waitlist" form, forwarded to HubSpot. */
export const CreateLeadRequest = z.object({
  email: z.email().max(254),
  firstname: z.string().trim().min(1).max(80),
  lastname: z.string().trim().min(1).max(80),
  phone: z.string().trim().max(40).optional(),
  customer_groups: z.string().trim().max(120).optional(),
  message: z.string().trim().max(2000).optional(),
});

export type CreateLeadRequest = z.infer<typeof CreateLeadRequest>;
