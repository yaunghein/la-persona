<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui';

const model = defineModel<'community' | 'cards'>({ required: true });

const tabItems = [
  { label: 'Community', value: 'community' },
  { label: 'Cards', value: 'cards' },
] satisfies TabsItem[];
</script>

<template>
  <UTabs
    v-model="model"
    :items="tabItems"
    :content="false"
    color="neutral"
    variant="pill"
    :ui="{
      root: 'w-full sm:w-fit',
      list: 'bg-[#171717] w-full sm:w-fit rounded-lg p-1',
      indicator: 'bg-[#232323]',
      trigger:
        'data-[state=active]:text-white data-[state=inactive]:text-[#8b8b8b] rounded-md px-4 py-2.5 grow-0 whitespace-nowrap text-center w-full sm:w-fit',
    }"
  />
</template>
