<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui';

defineProps<{
  items: DropdownMenuItem[][];
}>();
</script>

<template>
  <div class="flex justify-end" @click.stop>
    <UDropdownMenu :items="items" :content="{ align: 'end' }">
      <UTooltip text="Open menu">
        <UButton
          icon="i-lucide-ellipsis"
          color="neutral"
          variant="ghost"
          aria-label="Open menu"
          class="cursor-pointer p-0 text-muted hover:bg-transparent hover:text-ink"
        />
      </UTooltip>
    </UDropdownMenu>
  </div>
</template>
