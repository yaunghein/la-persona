<script setup lang="ts">
defineProps(['title', 'value', 'icon']);
</script>

<template>
  <div class="rounded-xl border border-white/5 bg-[#111] p-6 space-y-4">
    <div class="grid h-10 w-10 place-items-center rounded bg-white/5">
      <UIcon :name="icon" class="h-5 w-5 text-gray-400" />
    </div>
    <div>
      <div
        class="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1"
      >
        {{ title }}
      </div>
      <div class="text-3xl font-bold">{{ value }}</div>
    </div>
  </div>
</template>
