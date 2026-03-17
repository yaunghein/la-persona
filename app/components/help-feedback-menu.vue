<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui';
import type { FeedbackKind } from '~~/shared/types/feedback';

defineProps<{
  collapsed?: boolean;
}>();

const emit = defineEmits<{
  openFeedback: [kind: FeedbackKind];
}>();

const items = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: 'Facebook',
      to: 'https://facebook.com',
      target: '_blank',
    },
    {
      label: 'Instagram',
      to: 'https://instagram.com',
      target: '_blank',
    },
    {
      label: 'LinkedIn',
      to: 'https://linkedin.com',
      target: '_blank',
    },
    {
      label: 'Tiktok',
      to: 'https://tiktok.com',
      target: '_blank',
    },
  ],
  [
    {
      label: 'La Persona Docs',
      to: 'https://ui.nuxt.com',
      target: '_blank',
    },
    {
      label: 'Tutorials',
      to: 'https://nuxt.com/docs',
      target: '_blank',
    },
  ],
  [
    {
      label: 'Give Feedback',
      onSelect: () => emit('openFeedback', 'feedback'),
    },
    {
      label: 'Report a Bug',
      onSelect: () => emit('openFeedback', 'bug_report'),
    },
    {
      label: 'Feature Request',
      onSelect: () => emit('openFeedback', 'feature_request'),
    },
  ],
]);
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{
      side: 'top',
      align: 'start',
      sideOffset: 8,
      collisionPadding: 12,
    }"
    :ui="{
      content: collapsed ? 'w-48' : 'w-48',
      item: 'py-2',
    }"
  >
    <UButton
      :label="collapsed ? undefined : 'Help & Feedback'"
      icon="i-material-symbols:help-outline"
      color="neutral"
      variant="ghost"
      block
      :square="collapsed"
      :ui="{
        leadingIcon: 'text-dimmed',
      }"
      :class="[
        'data-[state=open]:bg-elevated',
        collapsed ? '' : 'justify-start',
      ]"
    />
  </UDropdownMenu>
</template>
