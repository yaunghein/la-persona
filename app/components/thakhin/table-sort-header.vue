<script setup lang="ts">
type SortableColumn = {
  getIsSorted: () => false | 'asc' | 'desc';
  toggleSorting: (desc?: boolean) => void;
};

const props = defineProps<{
  column: SortableColumn;
  label: string;
}>();

const isSorted = computed(() => props.column.getIsSorted());
const icon = computed(() => {
  if (isSorted.value === 'asc') return 'i-lucide-arrow-up-narrow-wide';
  if (isSorted.value === 'desc') return 'i-lucide-arrow-down-wide-narrow';
  return 'i-lucide-arrow-up-down';
});

function onToggle() {
  props.column.toggleSorting(props.column.getIsSorted() === 'asc');
}
</script>

<template>
  <UButton
    color="neutral"
    variant="ghost"
    :label="label"
    :icon="icon"
    class="-mx-2.5 font-semibold tracking-wide uppercase text-white hover:bg-white/5"
    @click="onToggle"
  />
</template>
