import { z } from 'zod';

export const OrganizationRouteParams = z.object({
  orgSlug: z.string().trim().min(1),
});
