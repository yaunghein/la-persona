<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui';
import type { ContactSummary } from '~~/shared/contracts/contact';

const props = defineProps<{ contact: ContactSummary }>();
const emit = defineEmits<{
  save: [contact: ContactSummary];
  delete: [contact: ContactSummary];
}>();

const items = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: 'Save Contact',
      icon: 'i-lucide-download',
      onSelect: () => emit('save', props.contact),
    },
    ...(props.contact.personaCardSlug
      ? [
          {
            label: 'View PERSONA Card',
            icon: 'i-lucide-external-link',
            to: `/c/${props.contact.personaCardSlug}`,
          },
        ]
      : []),
  ],
  [
    {
      label: 'Delete Contact',
      icon: 'i-lucide-trash-2',
      color: 'error',
      onSelect: () => emit('delete', props.contact),
    },
  ],
]);
</script>

<template>
  <UDropdownMenu :items="items">
    <UButton
      size="xl"
      icon="i-mdi-dots-vertical"
      color="neutral"
      variant="ghost"
      class="text-muted"
      :aria-label="`Actions for ${contact.name}`"
    />
  </UDropdownMenu>
</template>
