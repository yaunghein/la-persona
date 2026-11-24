<script setup lang="ts">
defineProps<{
  icon: string;
  title: string;
  description: string;
  action?: { label: string; to: string } | null;
}>();
</script>

<template>
  <main
    class="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center"
  >
    <UIcon :name="icon" class="size-8 text-muted" aria-hidden="true" />
    <h1 class="text-base font-medium uppercase tracking-widest text-ink">
      {{ title }}
    </h1>
    <p class="max-w-sm text-sm text-muted">
      {{ description }}
    </p>
    <UButton
      v-if="action"
      :label="action.label"
      :to="action.to"
      color="neutral"
      class="mt-2 h-10 text-sm rounded-full bg-ink px-5 font-medium text-ink-inverse hover:bg-ink/90"
    />
  </main>
</template>
