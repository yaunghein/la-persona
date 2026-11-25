<script setup lang="ts">
const props = defineProps<{
  page: number;
  total: number;
  itemsPerPage: number;
  loading?: boolean;
}>();

const emit = defineEmits<{
  'update:page': [page: number];
}>();

const { siblingCount, showEdges } = usePaginationWindow(0);
</script>

<template>
  <section class="flex flex-col gap-5">
    <div v-if="$slots.toolbar" class="flex flex-wrap items-center gap-2">
      <slot name="toolbar" />
    </div>
    <div v-if="loading" class="flex flex-col gap-2">
      <USkeleton v-for="i in 6" :key="i" class="h-14 w-full rounded-md" />
    </div>
    <div v-else class="hide-scrollbar overflow-x-auto">
      <slot />
    </div>
    <div class="flex items-center justify-center pt-4 sm:justify-end sm:pt-0">
      <UPagination
        :page="page"
        :total="props.total"
        :items-per-page="itemsPerPage"
        :sibling-count="siblingCount"
        :show-edges="showEdges"
        show-controls
        color="neutral"
        variant="outline"
        active-color="neutral"
        active-variant="solid"
        first-icon="i-lucide-chevrons-left"
        prev-icon="i-lucide-chevron-left"
        next-icon="i-lucide-chevron-right"
        last-icon="i-lucide-chevrons-right"
        @update:page="emit('update:page', $event)"
      />
    </div>
  </section>
</template>
