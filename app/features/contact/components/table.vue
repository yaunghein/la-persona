<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';
import type { ContactSummary } from '~~/shared/contracts/contact';
import {
  contactOriginLabel,
  contactOriginPath,
} from '~~/shared/utils/contact-origin';

const props = defineProps<{
  contacts: ContactSummary[];
  showOrigin: boolean;
}>();

defineEmits<{
  save: [contact: ContactSummary];
  delete: [contact: ContactSummary];
}>();

const headerClass = 'text-sm font-medium uppercase tracking-widest text-white';
const mutedCellClass = 'text-sm font-medium text-muted';

const columns = computed<TableColumn<ContactSummary>[]>(() => [
  {
    id: 'name',
    header: 'NAME',
    meta: { class: { th: headerClass, td: 'text-sm font-medium leading-[1.35]' } },
  },
  {
    id: 'company',
    header: 'COMPANY',
    meta: { class: { th: headerClass, td: mutedCellClass } },
  },
  {
    id: 'phone',
    header: 'PHONE NUMBER',
    meta: { class: { th: headerClass, td: mutedCellClass } },
  },
  {
    id: 'email',
    header: 'EMAIL',
    meta: { class: { th: headerClass, td: mutedCellClass } },
  },
  ...(props.showOrigin
    ? [
        {
          id: 'origin',
          header: 'ORIGIN',
          meta: { class: { th: headerClass, td: mutedCellClass } },
        },
      ]
    : []),
  {
    id: 'actions',
    header: '',
    meta: { class: { th: 'w-10', td: 'text-right text-muted text-base' } },
  },
]);
</script>

<template>
  <UTable
    :data="contacts"
    :columns="columns"
    :ui="{
      th: 'px-4 py-4 border-b border-[#232323]',
      td: 'px-4 py-3 border-b border-[#232323]',
      tr: 'bg-transparent',
      empty: 'py-16 text-center text-sm text-muted',
    }"
    class="w-full min-w-250"
  >
    <template #name-cell="{ row }">
      <div class="leading-[1.35]">
        <p class="flex items-center gap-1 text-sm font-medium text-white">
          {{ row.original.name }}
          <ContactPersonaBadge
            v-if="row.original.personaCardSlug"
            :card-slug="row.original.personaCardSlug"
          />
        </p>
        <p class="text-sm font-medium text-muted">
          {{ row.original.position || 'No role' }}
        </p>
      </div>
    </template>
    <template #company-cell="{ row }">{{ row.original.company || 'N/A' }}</template>
    <template #phone-cell="{ row }">{{ row.original.phone || 'N/A' }}</template>
    <template #email-cell="{ row }">{{ row.original.email || 'N/A' }}</template>
    <template #origin-cell="{ row }">
      <UButton
        v-if="contactOriginPath(row.original)"
        size="xl"
        :to="contactOriginPath(row.original)"
        color="neutral"
        variant="link"
        class="h-auto p-0 text-sm font-medium text-muted"
      >
        <UIcon name="i-lucide-external-link" class="ml-1 size-4" />
        <span>{{ contactOriginLabel(row.original) }}</span>
      </UButton>
      <span v-else class="text-sm font-medium text-muted">
        {{ contactOriginLabel(row.original) }}
      </span>
    </template>
    <template #actions-cell="{ row }">
      <ContactActionsMenu
        :contact="row.original"
        @save="$emit('save', $event)"
        @delete="$emit('delete', $event)"
      />
    </template>
  </UTable>
</template>
