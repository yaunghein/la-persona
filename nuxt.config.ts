// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/ui', 'nuxt-email-renderer'],
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      title: 'La Persona',
      htmlAttrs: { lang: 'en' },
    },
  },
  colorMode: {
    preference: 'dark',
  },
});
