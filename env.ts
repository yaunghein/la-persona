import arkenv from '@arkenv/nuxt';

/**
 * Single source of truth for environment variables.
 *
 * Validated and coerced once at Nitro boot (`@arkenv/nuxt/module`). Keys listed
 * in `exposeToClient` are published to the browser through
 * `runtimeConfig.public`; every other key throws if read on the client.
 * Optional integrations default to `''` and are treated as disabled when empty.
 */
export const env = arkenv(
  {
    NODE_ENV: "'development' | 'production' | 'test' = 'development'",

    BASE_URL: 'string.url',
    DATABASE_URL: 'string',
    BETTER_AUTH_SECRET: 'string >= 32',

    GITHUB_CLIENT_ID: "string = ''",
    GITHUB_CLIENT_SECRET: "string = ''",
    GOOGLE_CLIENT_ID: "string = ''",
    GOOGLE_CLIENT_SECRET: "string = ''",
    LINKEDIN_CLIENT_ID: "string = ''",
    LINKEDIN_CLIENT_SECRET: "string = ''",
    // Calendar scope is unverified by Google; keep off in production until approved.
    GOOGLE_CALENDAR_ENABLED: 'boolean = false',

    AWS_ACCESS_KEY: 'string',
    AWS_SECRET_ACCESS_KEY: 'string',
    AWS_REGION: 'string',
    AWS_BUCKET_NAME: 'string',

    RESEND_API_KEY: 'string',
    // Comma-separated recipients for internal alerts (payments, feedback, card requests).
    ADMIN_EMAILS: 'string.email[] = []',

    HUBSPOT_PORTAL_ID: 'string',
    HUBSPOT_FORM_GUID_LEAD: 'string',
    GTAG_ID: "string = ''",

    DEFAULT_SPLINE_URL: 'string.url',
    // S3 object keys (not full URLs) for the default card back and wallpaper.
    DEFAULT_CARD_BACK_URL: 'string > 0',
    DEFAULT_WALLPAPER_URL: 'string > 0',
    CUSTOM_DESIGN_FEE: 'number.integer >= 0',
    // Unclaimed Thakhin-created cards live here until an onboarding invite assigns a real org.
    PLACEHOLDER_ORGANIZATION_ID: 'string > 0',
  },
  {
    exposeToClient: [
      'BASE_URL',
      'AWS_REGION',
      'AWS_BUCKET_NAME',
      'GTAG_ID',
      'GOOGLE_CALENDAR_ENABLED',
    ],
  }
);
