<script setup lang="ts">
import type { Label } from '~~/shared/contracts/label';

defineProps<{ label: Label }>();
</script>

<template>
  <span
    class="inline-flex h-6 max-w-full items-center gap-1.5 rounded-full bg-raised px-2.5 text-xs font-medium text-ink"
  >
    <span
      class="size-2 shrink-0 rounded-full ring-1 ring-inset ring-ink/15"
      :style="{ backgroundColor: label.color }"
    />
    <span class="truncate">{{ label.name }}</span>
  </span>
</template>
