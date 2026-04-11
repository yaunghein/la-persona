// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: [
    '@nuxt/ui',
    'nuxt-email-renderer',
    '@vueuse/nuxt',
    'nuxt-gtag',
    'nuxt-security',
  ],
  security: {
    headers: {
      contentSecurityPolicy: {
        'img-src': [
          "'self'",
          'data:',
          'blob:',
          'https://*.googleusercontent.com',
          'https://la-persona-staging.s3.ap-southeast-2.amazonaws.com',
          'https://la-persona-prod.s3.ap-southeast-2.amazonaws.com',
        ],
        'script-src': [
          "'self'",
          "'unsafe-inline'", // Needed for Nuxt hydration
          "'unsafe-eval'", // <-- REQUIRED for Spline runtime (WebGL/Shaders)
          'https://fonts.gstatic.com',
          'https://prod.spline.design',
        ],
        'connect-src': [
          "'self'",
          'https://prod.spline.design',
          'https://fonts.gstatic.com',
          'https://prod.spline.design',
        ],
      },
    },
  },
  css: ['~/assets/css/main.css'],
  colorMode: {
    preference: 'dark',
  },
  runtimeConfig: {
    public: {
      awsRegion: process.env.AWS_REGION,
      awsBucketName: process.env.AWS_BUCKET_NAME,
      baseUrl: process.env.BASE_URL,
    },
  },
  gtag: {
    id: process.env.GTAG_ID,
    enabled: process.env.NODE_ENV === 'production',
  },
  routeRules: {
    '/': { prerender: true },
    '/platform/**': { ssr: false },
    '/thakhin/**': { ssr: false },
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
        {
          property: 'og:url',
          content: 'https://imgsrc.io/guides/open-graph-meta-tags',
        },
        { property: 'og:image', content: '/og.png' },
        { property: 'og:image:width', content: '1050' },
        { property: 'og:image:height', content: '600' },
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
        { name: 'twitter:image', content: '/og.png' },
      ],
    },
  },
});
