<script setup lang="ts">
defineProps<{ cardSlug: string }>();
</script>

<template>
  <NuxtLink
    :to="`/c/${cardSlug}`"
    class="inline-flex h-4 w-7 shrink-0 scale-90 cursor-pointer transition hover:opacity-80"
    aria-label="La Persona contact"
  >
    <IconLpBadge />
  </NuxtLink>
</template>
