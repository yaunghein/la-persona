<script setup lang="ts">
const props = defineProps<{
  page: number;
  total: number;
  itemsPerPage: number;
}>();

const emit = defineEmits<{
  'update:page': [page: number];
}>();

const pageCount = computed(() =>
  Math.max(1, Math.ceil(props.total / Math.max(props.itemsPerPage, 1)))
);
</script>

<template>
  <section class="overflow-hidden rounded-xl border border-white/10 bg-[#121212]">
    <div
      v-if="$slots.toolbar"
      class="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-3"
    >
      <slot name="toolbar" />
    </div>
    <div class="overflow-x-auto">
      <slot />
    </div>
    <footer
      class="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-3"
    >
      <p class="text-sm text-white/45">Page {{ page }} of {{ pageCount }}</p>
      <UPagination
        :page="page"
        :total="total"
        :items-per-page="itemsPerPage"
        size="sm"
        color="neutral"
        variant="ghost"
        @update:page="emit('update:page', $event)"
      />
    </footer>
  </section>
</template>
