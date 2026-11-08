<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';
import type { Cell } from '@tanstack/vue-table';
import type { ContactSummary } from '~~/shared/contracts/contact';
import type { Label } from '~~/shared/contracts/label';
import {
  contactOriginLabel,
  contactOriginPath,
} from '~~/shared/utils/contact-origin';

const props = defineProps<{
  contacts: ContactSummary[];
  showOrigin: boolean;
  /** When set, rows are grouped under these labels. */
  groupLabels?: Label[];
}>();

const emit = defineEmits<{
  save: [contact: ContactSummary];
  edit: [contact: ContactSummary];
  delete: [contact: ContactSummary];
}>();

type ContactRow = LabelGroupRow<ContactSummary>;

const collapsedGroupKeys = ref<string[]>([]);

const rows = computed<ContactRow[]>(() =>
  props.groupLabels
    ? labelGroupRows(
        groupByLabel(props.contacts, props.groupLabels),
        collapsedGroupKeys.value
      )
    : props.contacts.map((item) => ({ key: item.id, item }))
);

function toggleGroup(key: string) {
  collapsedGroupKeys.value = collapsedGroupKeys.value.includes(key)
    ? collapsedGroupKeys.value.filter((item) => item !== key)
    : [...collapsedGroupKeys.value, key];
}

const headerClass = 'text-sm font-medium uppercase tracking-widest text-ink';
const mutedCellClass = 'text-sm font-medium text-muted';
const itemCellClass =
  (className: string) => (cell: Cell<ContactRow, unknown>) =>
    cell.row.original.group ? 'hidden' : className;

const columns = computed<TableColumn<ContactRow>[]>(() => [
  {
    id: 'name',
    header: 'NAME',
    meta: {
      // A group header row is one cell spanning the whole table.
      colspan: {
        td: (cell: Cell<ContactRow, unknown>) =>
          cell.row.original.group ? String(cell.row.getAllCells().length) : '1',
      },
      class: {
        th: headerClass,
        td: (cell: Cell<ContactRow, unknown>) =>
          cell.row.original.group
            ? 'py-2.5'
            : 'text-sm font-medium leading-[1.35]',
      },
    },
  },
  {
    id: 'company',
    header: 'COMPANY',
    meta: { class: { th: headerClass, td: itemCellClass(mutedCellClass) } },
  },
  {
    id: 'phone',
    header: 'PHONE NUMBER',
    meta: { class: { th: headerClass, td: itemCellClass(mutedCellClass) } },
  },
  {
    id: 'email',
    header: 'EMAIL',
    meta: { class: { th: headerClass, td: itemCellClass(mutedCellClass) } },
  },
  {
    id: 'labels',
    header: 'LABELS',
    meta: { class: { th: headerClass, td: itemCellClass(mutedCellClass) } },
  },
  ...(props.showOrigin
    ? [
        {
          id: 'origin',
          header: 'ORIGIN',
          meta: {
            class: { th: headerClass, td: itemCellClass(mutedCellClass) },
          },
        },
      ]
    : []),
  {
    id: 'actions',
    header: '',
    meta: {
      class: {
        th: 'w-10',
        td: itemCellClass('text-right text-muted text-base'),
      },
    },
  },
]);
</script>

<template>
  <UTable
    :data="rows"
    :columns="columns"
    :meta="{
      class: {
        tr: (row) =>
          row.original.group
            ? 'bg-raised/40 cursor-default hover:bg-raised/40'
            : '',
      },
    }"
    :ui="{
      th: 'px-4 py-4 border-b border-raised',
      td: 'px-4 py-3 border-b border-raised',
      tr: 'bg-transparent cursor-pointer hover:bg-raised/50',
      empty: 'py-16 text-center text-sm text-muted',
    }"
    class="w-full min-w-250"
    @select="
      (_event, row) => {
        if (row.original.item) emit('edit', row.original.item);
      }
    "
  >
    <template #name-cell="{ row }">
      <UiLabelGroupHeader
        v-if="row.original.group"
        :label="row.original.group.label"
        :count="row.original.group.items.length"
        :collapsed="collapsedGroupKeys.includes(row.original.key)"
        @toggle="toggleGroup(row.original.key)"
      />
      <div v-else class="leading-[1.35]">
        <p class="flex items-center gap-1 text-sm font-medium text-ink">
          {{ row.original.item.name }}
          <ContactPersonaBadge
            v-if="row.original.item.personaCardSlug"
            :card-slug="row.original.item.personaCardSlug"
          />
        </p>
        <p class="text-sm font-medium text-muted">
          {{ row.original.item.position || 'No role' }}
        </p>
      </div>
    </template>
    <template #company-cell="{ row }">{{
      row.original.item?.company || 'N/A'
    }}</template>
    <template #phone-cell="{ row }">{{
      row.original.item?.phone || 'N/A'
    }}</template>
    <template #email-cell="{ row }">{{
      row.original.item?.email || 'N/A'
    }}</template>
    <template #labels-cell="{ row }">
      <UiLabelDots
        v-if="row.original.item"
        :labels="row.original.item.labels"
      />
    </template>
    <template #origin-cell="{ row }">
      <template v-if="row.original.item">
        <UButton
          v-if="contactOriginPath(row.original.item)"
          size="xl"
          :to="contactOriginPath(row.original.item)"
          color="neutral"
          variant="link"
          class="h-auto p-0 text-sm font-medium text-muted"
        >
          <UIcon name="i-lucide-external-link" class="ml-1 size-4" />
          <span>{{ contactOriginLabel(row.original.item) }}</span>
        </UButton>
        <span v-else class="text-sm font-medium text-muted">
          {{ contactOriginLabel(row.original.item) }}
        </span>
      </template>
    </template>
    <template #actions-cell="{ row }">
      <ContactActionsMenu
        v-if="row.original.item"
        :contact="row.original.item"
        @save="emit('save', $event)"
        @edit="emit('edit', $event)"
        @delete="emit('delete', $event)"
      />
    </template>
  </UTable>
</template>
