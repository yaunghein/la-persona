<script setup lang="ts">
defineProps<{
  title: string;
  description: string;
}>();
</script>

<template>
  <div class="flex flex-wrap items-end justify-between gap-3">
    <div class="min-w-0">
      <h1 class="text-2xl font-semibold tracking-tight text-ink">
        {{ title }}
      </h1>
      <p class="mt-1 max-w-2xl text-sm text-ink/50">{{ description }}</p>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <slot />
    </div>
  </div>
</template>
