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
    ? "The page you're looking for has left the room — or never had a seat."
    : 'We could not complete this request. Try again in a moment.'
);

useSeoMeta({
  title: isNotFound.value
    ? 'Page not found - LA PERSONA'
    : 'Something went wrong - LA PERSONA',
  description: description.value,
});

async function goHome() {
  await clearError({ redirect: ROUTES.HOME });
}
</script>

<template>
  <UApp>
    <div
      class="relative flex min-h-dvh flex-col overflow-hidden bg-dark text-white"
    >
      <header class="relative z-10 flex justify-center px-6 py-8 sm:py-10">
        <button type="button" class="inline-flex" @click="goHome">
          <IconLogo class="aspect-[1/0.09] w-32 text-white sm:w-40" />
          <span class="sr-only">LA PERSONA home</span>
        </button>
      </header>

      <main
        class="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center"
      >
        <p
          class="font-bold uppercase text-white font-heading"
          :class="
            isNotFound
              ? 'pl-[0.18em] text-[5rem] leading-none sm:text-[8.5rem]'
              : 'text-sm sm:text-base'
          "
        >
          {{ isNotFound ? '404' : error.statusCode || 'Error' }}
        </p>

        <h1
          class="mt-8 max-w-2xl text-[1.75rem] font-medium leading-tight tracking-widest uppercase sm:text-4xl"
        >
          {{ heading }}
        </h1>
        <p
          class="mt-4 max-w-sm text-sm leading-relaxed text-[#8b8b8b] sm:text-base"
        >
          {{ description }}
        </p>

        <UButton
          size="xl"
          color="neutral"
          class="mt-10 h-11 rounded-full bg-white px-8 font-medium text-dark hover:bg-white/90"
          @click="goHome"
        >
          Back to home
        </UButton>
      </main>

      <footer
        class="relative z-10 px-6 pb-8 text-center text-xs font-light uppercase tracking-wide text-white/30"
      >
        © la persona. All rights reserved.
      </footer>
    </div>
  </UApp>
</template>
