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
    class="h-auto cursor-pointer gap-1.5 p-0 text-sm font-medium uppercase tracking-widest text-ink hover:bg-transparent"
    :ui="{ leadingIcon: 'size-3.5 text-muted' }"
    @click="onToggle"
  />
</template>
