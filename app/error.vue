<script setup lang="ts">
import type { NuxtError } from '#app';
import { ROUTES } from '~~/shared/utils/routes';

const props = defineProps<{
  error: NuxtError;
}>();

const isNotFound = computed(() => Number(props.error.statusCode) === 404);

const heading = computed(() =>
  isNotFound.value ? "This presence isn't here" : 'Something went off-script'
);

const description = computed(() =>
  isNotFound.value
    ? "The page you're looking for has left the room — or never had a\u00a0seat."
    : 'We could not complete this request. Try again in a\u00a0moment.'
);

useSeoMeta({
  title: isNotFound.value
    ? 'Page not found - LA PERSONA'
    : 'Something went wrong - LA PERSONA',
  description: description.value,
  robots: 'noindex',
});

async function goHome() {
  await clearError({ redirect: ROUTES.HOME });
}
</script>

<template>
  <UApp>
    <div
      class="relative flex min-h-dvh flex-col overflow-hidden bg-canvas text-ink"
    >
      <header class="relative z-10 flex justify-center px-6 py-8 sm:py-10">
        <button type="button" class="inline-flex" @click="goHome">
          <IconLogo class="aspect-[1/0.09] w-32 text-ink sm:w-40" />
          <span class="sr-only">LA PERSONA home</span>
        </button>
      </header>

      <main
        class="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center"
      >
        <p
          class="pl-[0.18em] font-heading text-[5rem] font-bold leading-none text-ink uppercase sm:text-[8.5rem]"
        >
          {{ error.statusCode || 'Error' }}
        </p>

        <h1
          class="mt-6 max-w-xl text-2xl font-medium leading-tight tracking-wider text-balance uppercase sm:text-3xl"
        >
          {{ heading }}
        </h1>
        <p
          class="mt-4 max-w-md text-sm leading-relaxed text-balance text-subtle sm:text-base"
        >
          {{ description }}
        </p>

        <UButton
          color="neutral"
          class="mt-10 h-10 text-sm rounded-full bg-ink px-8 font-medium text-ink-inverse hover:bg-ink/90"
          @click="goHome"
        >
          Back to home
        </UButton>
      </main>

      <footer
        class="relative z-10 px-6 pb-8 text-center text-xs font-light uppercase tracking-wide text-ink/30"
      >
        © la persona. All rights reserved.
      </footer>
    </div>
  </UApp>
</template>
