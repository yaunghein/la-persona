<script setup lang="ts">
import type { CardLinkMenuItem } from '~~/shared/constants/card-link-options';

const label = defineModel<string>({ required: true });

defineProps<{
  items: CardLinkMenuItem[][];
}>();
</script>

<template>
  <USelectMenu
    v-model="label"
    :items="items"
    value-key="label"
    :search-input="false"
    size="md"
    placeholder="Select Link Type"
    class="w-full"
    :ui="{
      base: 'h-[47px] rounded-[4px] border-line bg-raised text-sm text-ink',
      content: 'border border-line bg-surface shadow-lg',
      viewport: 'divide-y-0 py-1',
      item: 'gap-2 rounded-md px-2 py-1.5 text-sm',
    }"
  >
    <template #leading="{ modelValue }">
      <CardLinkTypeMark v-if="modelValue" :label="String(modelValue)" />
    </template>
    <template #item-leading="{ item }">
      <CardLinkTypeMark :label="typeof item === 'string' ? item : item.label" />
    </template>
  </USelectMenu>
</template>
