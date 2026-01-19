import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  DATABASE_URL: z.string(),
  BETTER_AUTH_SECRET: z.string(),
  GITHUB_CLIENT_ID: z.string(),
  GITHUB_CLIENT_SECRET: z.string(),
  DEFAULT_SPLINE_URL: z.string(),
  RESEND_API_KEY: z.string(),
  HUBSPOT_PORTAL_ID: z.string(),
  HUBSPOT_FORM_GUID_LEAD: z.string(),
  NUXT_PUBLIC_BASE_URL: z.string(),
  NUXT_PUBLIC_GTAG_ID: z.string(),
});

export type EnvSchema = z.infer<typeof EnvSchema>;

export const env = EnvSchema.parse(process.env);
