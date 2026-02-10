<script setup lang="ts">
defineProps(['title', 'desc', 'count', 'icon']);
</script>

<template>
  <div
    class="flex items-center justify-between rounded-lg bg-white/5 p-4 border border-white/5"
  >
    <div class="flex items-center gap-4">
      <div class="grid h-10 w-10 place-items-center rounded bg-white/5">
        <UIcon :name="icon" class="h-5 w-5 text-gray-400" />
      </div>
      <div>
        <div class="text-sm font-bold">{{ title }}</div>
        <div class="text-[10px] text-gray-500">{{ desc }}</div>
      </div>
    </div>
    <div class="text-lg font-bold">{{ count }}</div>
  </div>
</template>
