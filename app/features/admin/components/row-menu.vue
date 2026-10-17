<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui';

defineProps<{
  items: DropdownMenuItem[][];
}>();
</script>

<template>
  <div class="flex justify-end" @click.stop>
    <UDropdownMenu :items="items" :content="{ align: 'end' }">
      <UButton
        icon="i-lucide-ellipsis"
        color="neutral"
        variant="ghost"
        size="sm"
        aria-label="Open menu"
        class="text-white/45"
      />
    </UDropdownMenu>
  </div>
</template>
