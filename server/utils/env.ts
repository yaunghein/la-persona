import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  DATABASE_URL: z.string(),
  BETTER_AUTH_SECRET: z.string(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  LINKEDIN_CLIENT_ID: z.string().optional(),
  LINKEDIN_CLIENT_SECRET: z.string().optional(),
  DEFAULT_SPLINE_URL: z.string(),
  HUBSPOT_PORTAL_ID: z.string(),
  HUBSPOT_FORM_GUID_LEAD: z.string(),
  RESEND_API_KEY: z.string(),
  AWS_ACCESS_KEY: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),
  AWS_REGION: z.string(),
  AWS_BUCKET_NAME: z.string(),
  BASE_URL: z.string(),
  GTAG_ID: z.string(),
});

export type EnvSchema = z.infer<typeof EnvSchema>;

export const env = EnvSchema.parse(process.env);
