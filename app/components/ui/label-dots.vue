<script setup lang="ts">
import type { Label } from '~~/shared/contracts/label';

const props = withDefaults(defineProps<{ labels: Label[]; max?: number }>(), {
  max: 3,
});

const visible = computed(() => props.labels.slice(0, props.max));
const hiddenCount = computed(() => props.labels.length - visible.value.length);
const summary = computed(
  () => `Labels: ${props.labels.map((label) => label.name).join(', ')}`
);
</script>

<template>
  <!-- Click, not hover, so the names open on touch screens too. -->
  <UPopover
    v-if="labels.length"
    :content="{ align: 'start', side: 'bottom', sideOffset: 6 }"
    :ui="{ content: 'border border-line bg-surface p-3' }"
  >
    <button
      type="button"
      class="flex h-6 cursor-pointer items-center gap-1 rounded-full px-1 hover:bg-raised"
      :aria-label="summary"
      @click.stop
    >
      <span
        v-for="label in visible"
        :key="label.id"
        class="size-2.5 shrink-0 rounded-full ring-1 ring-inset ring-ink/15"
        :style="{ backgroundColor: label.color }"
      />
      <span v-if="hiddenCount" class="text-xs font-medium text-subtle">
        +{{ hiddenCount }}
      </span>
    </button>

    <template #content>
      <ul class="flex max-w-60 flex-col gap-2">
        <li
          v-for="label in labels"
          :key="label.id"
          class="flex items-center gap-2 text-sm text-ink"
        >
          <span
            class="size-2.5 shrink-0 rounded-full ring-1 ring-inset ring-ink/15"
            :style="{ backgroundColor: label.color }"
          />
          <span class="truncate">{{ label.name }}</span>
        </li>
      </ul>
    </template>
  </UPopover>
</template>
