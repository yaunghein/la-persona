<script setup lang="ts">
const props = defineProps<{
  title: string;
  items?: { count: number; [key: string]: any }[];
  labelKey: string;
}>();

// The filler should be proportional to max number
const maxVal = computed(() => {
  if (!props.items?.length) return 1;
  const max = Math.max(...props.items.map((i) => i.count));
  return max === 0 ? 1 : max;
});
</script>

<template>
  <div class="rounded-xl border border-white/5 bg-[#111] p-6">
    <h2 class="text-sm font-bold uppercase tracking-widest mb-6 text-gray-200">
      {{ title }}
    </h2>
    <div class="space-y-6">
      <div v-for="item in items" :key="item[labelKey]">
        <div
          class="flex justify-between text-[11px] font-bold uppercase mb-2 tracking-tighter"
        >
          <span class="text-gray-400">{{ item[labelKey] }}</span>
          <span class="text-white">{{ item.count }}</span>
        </div>
        <div class="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
          <div
            class="h-full bg-white"
            :style="{ width: `${(item.count / maxVal) * 100}%` }"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>
