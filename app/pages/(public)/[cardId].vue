<script setup lang="ts">
import { ROUTES } from '~~/shared/utils/routes';

const { cardId } = useRoute().params;
const card = cards.find((card) => card.id === cardId);

if (!card) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Page not found',
  });
}

usePageSeo({ title: card.name });
useSeoMeta({ robots: 'noindex' });

const contactLinks = [
  { label: 'Facebook', href: 'https://www.facebook.com/share/1A3rzUmSoh/' },
  { label: 'Instagram', href: 'https://www.instagram.com/lapersona.mm' },
];
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-canvas text-ink">
    <header class="flex justify-center px-6 py-8 sm:py-10">
      <NuxtLink :to="ROUTES.HOME" class="inline-flex">
        <IconLogo class="aspect-[1/0.09] w-32 text-ink sm:w-40" />
        <span class="sr-only">LA PERSONA home</span>
      </NuxtLink>
    </header>

    <main
      class="flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center"
    >
      <h1
        class="max-w-xl text-2xl font-medium leading-tight tracking-wider text-balance uppercase sm:text-3xl"
      >
        We're moving to our new&nbsp;platform
      </h1>
      <p
        class="mt-4 max-w-md text-sm leading-relaxed text-balance text-subtle sm:text-base"
      >
        This card is no longer available. If you're the owner of this card,
        please contact LA&nbsp;PERSONA to set up your new digital&nbsp;card.
      </p>

      <div class="mt-10 flex flex-wrap justify-center gap-3">
        <UButton
          v-for="link in contactLinks"
          :key="link.label"
          :to="link.href"
          target="_blank"
          color="neutral"
          class="h-10 rounded-full bg-ink px-8 text-sm font-medium text-ink-inverse hover:bg-ink/90"
        >
          {{ link.label }}
        </UButton>
      </div>
    </main>

    <footer
      class="px-6 pb-8 text-center text-xs font-light uppercase tracking-wide text-ink/30"
    >
      © la persona. All rights reserved.
    </footer>
  </div>
</template>
