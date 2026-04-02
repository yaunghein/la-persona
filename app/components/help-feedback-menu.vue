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
      to: 'https://www.facebook.com/share/1BBTr3Emyh/',
      target: '_blank',
    },
    {
      label: 'Instagram',
      to: 'https://www.instagram.com/lapersona.mm',
      target: '_blank',
    },
    {
      label: 'LinkedIn',
      to: 'https://www.linkedin.com/company/la-persona-mm/',
      target: '_blank',
    },
    {
      label: 'Tiktok',
      to: 'https://www.tiktok.com/@lapersona.mm',
      target: '_blank',
    },
  ],
  [
    {
      label: 'La Persona Docs (Coming Soon)',
      to: 'https://ui.nuxt.com',
      target: '_blank',
      disabled: true,
    },
    {
      label: 'Tutorials (Coming Soon)',
      to: 'https://nuxt.com/docs',
      target: '_blank',
      disabled: true,
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
      content: 'bg-[#171717] border border-[#2a2a2a]',
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
