<script setup lang="ts">
defineProps<{
  title: string;
  description: string;
  descriptionClass: string;
}>();
</script>

<template>
  <div
    class="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
  >
    <div class="min-w-0">
      <h1
        class="text-2xl font-medium uppercase leading-tight tracking-widest text-ink"
      >
        {{ title }}
      </h1>
      <p
        class="mt-2 text-sm leading-relaxed text-muted"
        :class="descriptionClass"
      >
        {{ description }}
      </p>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <slot />
    </div>
  </div>
</template>
