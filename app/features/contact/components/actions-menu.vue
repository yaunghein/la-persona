<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui';
import type { ContactSummary } from '~~/shared/contracts/contact';

const props = defineProps<{ contact: ContactSummary }>();
const emit = defineEmits<{
  save: [contact: ContactSummary];
  edit: [contact: ContactSummary];
  delete: [contact: ContactSummary];
}>();

const toast = useToast();
const { data: labels } = useContactLabelsQuery();
const { mutate: updateContact } = useUpdateContactMutation();

function toggleLabel(labelId: string, isChecked: boolean) {
  const current = props.contact.labels.map((label) => label.id);
  const labelIds = isChecked
    ? [...current, labelId]
    : current.filter((id) => id !== labelId);
  updateContact(
    { contactId: props.contact.id, input: { labelIds } },
    {
      onError: (error) =>
        toast.add({
          title: 'Could not update labels',
          description: apiErrorMessage(error),
          color: 'error',
        }),
    }
  );
}

const labelItems = computed<DropdownMenuItem[]>(() =>
  (labels.value ?? []).map((label) => ({
    label: label.name,
    type: 'checkbox' as const,
    checked: props.contact.labels.some((item) => item.id === label.id),
    onUpdateChecked: (isChecked: boolean) => toggleLabel(label.id, isChecked),
    // Keep the menu open so several labels can be toggled in a row.
    onSelect: (event: Event) => event.preventDefault(),
    slot: 'label-item' as const,
    labelColor: label.color,
  }))
);

const items = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: 'Save Contact',
      icon: 'i-lucide-download',
      onSelect: () => emit('save', props.contact),
    },
    {
      label: 'Edit Contact',
      icon: 'i-lucide-pencil',
      onSelect: () => emit('edit', props.contact),
    },
    ...(labelItems.value.length
      ? [{ label: 'Labels', icon: 'i-lucide-tag', children: labelItems.value }]
      : []),
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
    <UTooltip :text="`Actions for ${contact.name}`">
      <UButton
        size="xl"
        icon="i-mdi-dots-vertical"
        color="neutral"
        variant="ghost"
        class="text-muted"
        :aria-label="`Actions for ${contact.name}`"
      />
    </UTooltip>
    <template #label-item-leading="{ item }">
      <span
        class="mx-0.5 size-2.5 shrink-0 rounded-full ring-1 ring-inset ring-ink/15"
        :style="{ backgroundColor: (item as DropdownMenuItem).labelColor }"
      />
    </template>
  </UDropdownMenu>
</template>
