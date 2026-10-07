<script setup lang="ts">
type SortableColumn = {
  getIsSorted: () => false | 'asc' | 'desc';
  toggleSorting: (desc?: boolean) => void;
};

const props = defineProps<{
  column: SortableColumn;
  label: string;
}>();

const prettyLabel = computed(() =>
  props.label
    .toLowerCase()
    .split(/\s+/)
    .map((word) => (word === 'id' ? 'ID' : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(' ')
);

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
    :label="prettyLabel"
    :icon="icon"
    size="sm"
    class="-ml-2 h-8 px-2 text-xs font-medium text-white/45 hover:bg-white/5 hover:text-white"
    @click="onToggle"
  />
</template>
