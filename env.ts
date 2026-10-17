import { z } from 'zod';

const PublicEnv = z.object({
  BASE_URL: z.url(),
  AWS_REGION: z.string(),
  AWS_BUCKET_NAME: z.string(),
  GTAG_ID: z.string().default(''),
  GOOGLE_CALENDAR_ENABLED: z.stringbool().default(false),
});

const ServerEnv = PublicEnv.extend({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  DATABASE_URL: z.string(),
  BETTER_AUTH_SECRET: z.string().min(32),
  GITHUB_CLIENT_ID: z.string().default(''),
  GITHUB_CLIENT_SECRET: z.string().default(''),
  GOOGLE_CLIENT_ID: z.string().default(''),
  GOOGLE_CLIENT_SECRET: z.string().default(''),
  LINKEDIN_CLIENT_ID: z.string().default(''),
  LINKEDIN_CLIENT_SECRET: z.string().default(''),
  AWS_ACCESS_KEY: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),
  RESEND_API_KEY: z.string(),
  ADMIN_EMAILS: z
    .string()
    .default('')
    .transform((value) =>
      value
        .split(',')
        .map((email) => email.trim())
        .filter(Boolean)
    )
    .pipe(z.array(z.email())),
  HUBSPOT_PORTAL_ID: z.string(),
  HUBSPOT_FORM_GUID_LEAD: z.string(),
  DEFAULT_SPLINE_URL: z.url(),
  DEFAULT_CARD_BACK_URL: z.string().min(1),
  DEFAULT_WALLPAPER_URL: z.string().min(1),
  PLACEHOLDER_ORGANIZATION_ID: z.string().min(1), // Unclaimed Thakhin-created cards live here until an onboarding invite assigns a real org.
});

export const env = (
  import.meta.client
    ? PublicEnv.parse((globalThis as any).__NUXT__.config.public)
    : ServerEnv.parse(process.env)
) as z.infer<typeof ServerEnv>;
