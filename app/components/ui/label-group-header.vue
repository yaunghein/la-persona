<script setup lang="ts">
import type { Label } from '~~/shared/contracts/label';

defineProps<{
  label: Label | null;
  count: number;
  collapsed: boolean;
}>();

const emit = defineEmits<{ toggle: [] }>();
</script>

<template>
  <button
    type="button"
    class="flex w-full cursor-pointer items-center gap-2.5 text-left"
    :aria-expanded="!collapsed"
    @click.stop="emit('toggle')"
  >
    <UIcon
      name="i-lucide-chevron-down"
      class="size-4 shrink-0 text-subtle transition-transform"
      :class="collapsed && '-rotate-90'"
    />
    <span
      v-if="label"
      class="size-2.5 shrink-0 rounded-full ring-1 ring-inset ring-ink/15"
      :style="{ backgroundColor: label.color }"
    />
    <span
      v-else
      class="size-2.5 shrink-0 rounded-full border border-dashed border-subtle"
    />
    <span class="truncate text-sm font-medium text-ink">
      {{ label?.name ?? 'No label' }}
    </span>
    <span
      class="rounded-full bg-raised px-2 py-0.5 text-xs font-medium tabular-nums text-muted"
    >
      {{ count }}
    </span>
  </button>
</template>
