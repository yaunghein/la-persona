// https://nuxt.com/docs/api/configuration/nuxt-config
// Build-time values only. Runtime env is validated and read through `~~/env` (ArkEnv).
// Crawlers need an absolute og:image. Pages override it via usePageSeo.
const DEFAULT_OG_IMAGE = `${(process.env.BASE_URL || '').replace(/\/$/, '')}/og.png`;

// Feature modules under app/features/<domain>. Components auto-import with the
// domain as prefix (features/event/components/create-slideover.vue -> <EventCreateSlideover>).
const FEATURE_DOMAINS = [
  'admin',
  'analytics',
  'auth',
  'billing',
  'card',
  'contact',
  'event',
  'feedback',
  'marketing',
  'media',
  'onboarding',
  'organization',
] as const;

const toPascalCase = (value: string) =>
  value.replace(/(^|-)(\w)/g, (_, __, letter: string) => letter.toUpperCase());

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: [
    '@arkenv/nuxt/module',
    '@nuxt/ui',
    'nuxt-email-renderer',
    '@vueuse/nuxt',
    'nuxt-gtag',
    'nuxt-security',
    '@nuxt/image',
  ],
  image: {
    quality: 80,
    domains: [
      'la-persona-staging.s3.ap-southeast-2.amazonaws.com',
      'la-persona-prod.s3.ap-southeast-2.amazonaws.com',
      'la-persona-staging.s3.amazonaws.com',
      'la-persona-prod.s3.amazonaws.com',
    ],
    ipx: {
      // 30 days. S3 keys are unique per upload; rename public/ images when replacing them.
      // TODO: when traffic grows, put Cloudflare in front so /_ipx is cached at the edge
      // and each image is converted once instead of once per visitor.
      maxAge: 60 * 60 * 24 * 30,
      modifiers: {
        format: 'webp',
      },
    },
  },
  $development: {
    security: {
      headers: {
        strictTransportSecurity: false,
        contentSecurityPolicy: {
          'upgrade-insecure-requests': false,
        },
      },
    },
  },
  security: {
    headers: {
      permissionsPolicy: {
        camera: ['self'],
      },
      contentSecurityPolicy: {
        'img-src': [
          "'self'",
          'data:',
          'blob:',
          'https://*.googleusercontent.com',
          'https://avatar.vercel.sh',
          'https://la-persona-staging.s3.ap-southeast-2.amazonaws.com',
          'https://la-persona-prod.s3.ap-southeast-2.amazonaws.com',
        ],
        'script-src': [
          "'self'",
          "'unsafe-inline'", // Needed for Nuxt hydration
          "'unsafe-eval'", // <-- REQUIRED for Spline runtime (WebGL/Shaders)
          "'wasm-unsafe-eval'", // QR check-in decoder (zxing wasm)
          'https://fonts.gstatic.com',
          'https://prod.spline.design',
          'https://www.googletagmanager.com',
          'https://www.google-analytics.com/',
        ],
        'connect-src': [
          "'self'",
          'https://prod.spline.design',
          'https://fonts.gstatic.com',
          'https://prod.spline.design',
          'https://www.googletagmanager.com',
          'https://www.google-analytics.com/',
          'https://la-persona-staging.s3.ap-southeast-2.amazonaws.com',
          'https://la-persona-prod.s3.ap-southeast-2.amazonaws.com',
        ],
      },
    },
  },
  components: [
    '~/components',
    ...FEATURE_DOMAINS.map((domain) => ({
      path: `~/features/${domain}/components`,
      prefix: toPascalCase(domain),
    })),
  ],
  imports: {
    dirs: ['features/*/composables', 'features/*/utils'],
  },
  css: ['~/assets/css/main.css'],
  colorMode: {
    preference: 'dark',
  },
  vite: {
    optimizeDeps: {
      include: [
        '@nuxt/ui > prosemirror-state',
        '@nuxt/ui > prosemirror-transform',
        '@nuxt/ui > prosemirror-model',
        '@nuxt/ui > prosemirror-view',
        '@nuxt/ui > prosemirror-gapcursor',
      ],
    },
  },
  gtag: {
    id: process.env.GTAG_ID,
    enabled: process.env.NODE_ENV === 'production',
  },
  icon: {
    serverBundle: {
      collections: ['lucide'],
    },
    clientBundle: {
      scan: {
        // default scan skips .ts/.js; some icon names live there
        globInclude: ['**/*.{vue,ts,js}'],
      },
    },
  },
  nitro: {
    experimental: {
      tasks: true,
    },
    scheduledTasks: {
      // Keep stored subscription statuses in sync with trial/term end dates.
      '*/10 * * * *': ['subscriptions:expire'],
    },
    prerender: {
      // Prerendering IPX images silently aborts the build; serve them at runtime.
      ignore: ['/_ipx'],
    },
    compressPublicAssets: true,
    // Email artwork the server draws on (QR ticket); dir is relative to server/.
    serverAssets: [
      { baseName: 'email-images', dir: '../public/images/emails' },
    ],
    externals: {
      external: ['pino', 'pino-pretty'],
    },
  },
  routeRules: {
    '/': { prerender: true },
    '/privacy-policy': { prerender: true },
    '/platform': { ssr: false },
    '/platform/**': { ssr: false },
    '/invite/**': { ssr: false },
    // Rendered on the server so shared join links get the community preview.
    '/invite/community/join/**': { ssr: true },
    '/thakhin/**': { ssr: false },
    // Pages can request many images; keep them out of the shared request budget.
    '/_ipx/**': {
      security: {
        rateLimiter: { tokensPerInterval: 600, interval: 300000 },
      },
    },
  },
  app: {
    head: {
      title: 'Elevate Your Presence - LA PERSONA',
      htmlAttrs: { lang: 'en' },
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/images/favicon.png' },
      ],
      meta: [
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1, maximum-scale=1',
        },
        {
          name: 'description',
          content:
            'Experience the elegance of a card tailored to your identity. From the sleek phone wallpaper to the interactive 3D design, each element reflects your brand with precision and style.',
        },
        { name: 'theme-color', content: '#121212' },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: 'Elevate Your Presence - LA PERSONA' },
        {
          property: 'og:description',
          content:
            'Experience the elegance of a card tailored to your identity. From the sleek phone wallpaper to the interactive 3D design, each element reflects your brand with precision and style.',
        },
        { property: 'og:site_name', content: 'LA PERSONA' },
        { property: 'og:image', content: DEFAULT_OG_IMAGE },
        { name: 'twitter:card', content: 'summary_large_image' },
        {
          name: 'twitter:title',
          content: 'Elevate Your Presence - LA PERSONA',
        },
        {
          name: 'twitter:description',
          content:
            'Experience the elegance of a card tailored to your identity. From the sleek phone wallpaper to the interactive 3D design, each element reflects your brand with precision and style.',
        },
        { name: 'twitter:image', content: DEFAULT_OG_IMAGE },
      ],
    },
  },
});
