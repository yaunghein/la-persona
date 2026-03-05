<script setup lang="ts">
definePageMeta({
  layout: 'thakhin',
});
</script>

<template>
  <div class="rounded-lg border border-[#232323] bg-[#171717] p-8">
    <h1 class="text-xl font-semibold text-white">Thakhin Overview</h1>
    <p class="mt-2 text-sm text-[#8b8b8b]">
      Use the sidebar to review incoming card requests.
    </p>
    <UButton
      to="/thakhin/requests"
      label="Go to Requests"
      icon="i-lucide-arrow-right"
      class="mt-6 rounded-full"
      color="neutral"
    />
  </div>
</template>
