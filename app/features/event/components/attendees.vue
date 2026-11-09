<script setup lang="ts">
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui';
import type { Cell } from '@tanstack/vue-table';
import {
  attendeeStatusLabel,
  type EventAttendee,
} from '~~/shared/contracts/event';

const props = defineProps<{
  attendees: EventAttendee[];
  allowApprove?: boolean;
  /** Organizers manage and attach labels; volunteers only see them. */
  canManageLabels?: boolean;
  /** Organizers download the guest list. Volunteers do not see the button. */
  canExport?: boolean;
}>();

const emit = defineEmits<{
  select: [attendee: EventAttendee];
  approve: [attendee: EventAttendee];
  export: [];
}>();

type AttendeeTab = 'all' | 'pending' | 'registered' | 'checked_in';

const toast = useToast();
const { organizationSlug } = useOrganizationSlug();
const { data: labels } = useAttendeeLabelsQuery(organizationSlug);
const { mutate: replaceLabels } = useReplaceRegistrationLabelsMutation();

const searchQuery = ref('');
const activeTab = ref<AttendeeTab>('all');
const selectedLabelIds = ref<string[]>([]);
const isGrouped = ref(false);
const isLabelsOpen = ref(false);
const page = ref(1);
const itemsPerPage = 10;

const tabCounts = computed(() => ({
  all: props.attendees.length,
  pending: props.attendees.filter((a) => a.status === 'pending').length,
  registered: props.attendees.filter((a) => a.status === 'registered').length,
  checkedIn: props.attendees.filter((a) => a.status === 'checked_in').length,
}));

const tabs = computed(() => [
  { label: `Total (${tabCounts.value.all})`, value: 'all' as const },
  {
    label: `Pending (${tabCounts.value.pending})`,
    value: 'pending' as const,
  },
  {
    label: `Registered (${tabCounts.value.registered})`,
    value: 'registered' as const,
  },
  {
    label: `Checked-in (${tabCounts.value.checkedIn})`,
    value: 'checked_in' as const,
  },
]);

const filteredAttendees = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();

  return props.attendees.filter((attendee) => {
    if (activeTab.value !== 'all' && attendee.status !== activeTab.value) {
      return false;
    }

    if (
      selectedLabelIds.value.length &&
      !attendee.labels.some((label) =>
        selectedLabelIds.value.includes(label.id)
      )
    ) {
      return false;
    }

    if (!query) return true;

    return (
      attendee.name.toLowerCase().includes(query) ||
      attendee.role.toLowerCase().includes(query) ||
      attendee.company.toLowerCase().includes(query) ||
      attendeeStatusLabel(attendee).toLowerCase().includes(query) ||
      (attendee.email || '').toLowerCase().includes(query)
    );
  });
});

const total = computed(() => filteredAttendees.value.length);
const pagedAttendees = computed(() => {
  const start = (page.value - 1) * itemsPerPage;
  return filteredAttendees.value.slice(start, start + itemsPerPage);
});

type AttendeeRow = LabelGroupRow<EventAttendee>;

const collapsedGroupKeys = ref<string[]>([]);

const rows = computed<AttendeeRow[]>(() => {
  if (!isGrouped.value) {
    return pagedAttendees.value.map((item) => ({ key: item.id, item }));
  }
  const groupLabels = (labels.value ?? []).filter(
    (label) =>
      !selectedLabelIds.value.length ||
      selectedLabelIds.value.includes(label.id)
  );
  return labelGroupRows(
    groupByLabel(filteredAttendees.value, groupLabels),
    collapsedGroupKeys.value
  );
});

function toggleGrouping() {
  isGrouped.value = !isGrouped.value;
}

function toggleGroup(key: string) {
  collapsedGroupKeys.value = collapsedGroupKeys.value.includes(key)
    ? collapsedGroupKeys.value.filter((item) => item !== key)
    : [...collapsedGroupKeys.value, key];
}

watch([searchQuery, activeTab, selectedLabelIds], () => {
  page.value = 1;
});

watch(filteredAttendees, () => {
  const maxPage = Math.max(1, Math.ceil(total.value / itemsPerPage));
  if (page.value > maxPage) page.value = maxPage;
});

const hiddenOnGroupRow = {
  class: {
    td: (cell: Cell<AttendeeRow, unknown>) =>
      cell.row.original.group ? 'hidden' : '',
  },
};

const columns: TableColumn<AttendeeRow>[] = [
  {
    id: 'name',
    header: 'NAME',
    meta: {
      // A group header row is one cell spanning the whole table.
      colspan: {
        td: (cell: Cell<AttendeeRow, unknown>) =>
          cell.row.original.group ? String(cell.row.getAllCells().length) : '1',
      },
      class: {
        td: (cell: Cell<AttendeeRow, unknown>) =>
          cell.row.original.group ? 'py-2.5' : '',
      },
    },
  },
  { id: 'company', header: 'COMPANY', meta: hiddenOnGroupRow },
  { id: 'email', header: 'EMAIL', meta: hiddenOnGroupRow },
  { id: 'status', header: 'STATUS', meta: hiddenOnGroupRow },
  { id: 'labels', header: 'LABELS', meta: hiddenOnGroupRow },
  { id: 'actions', header: '', meta: hiddenOnGroupRow },
];

function toggleLabel(
  attendee: EventAttendee,
  labelId: string,
  isChecked: boolean
) {
  const current = attendee.labels.map((label) => label.id);
  replaceLabels(
    {
      registrationId: attendee.id,
      labelIds: isChecked
        ? [...current, labelId]
        : current.filter((id) => id !== labelId),
    },
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

function getActionItems(attendee: EventAttendee): DropdownMenuItem[][] {
  const items: DropdownMenuItem[] = [
    {
      label: 'View profile',
      icon: 'i-lucide-user',
      onSelect: () => emit('select', attendee),
    },
  ];

  if (attendee.status === 'pending' && props.allowApprove !== false) {
    items.push({
      label: 'Approve',
      icon: 'i-lucide-check',
      onSelect: () => emit('approve', attendee),
    });
  }

  if (props.canManageLabels && labels.value?.length) {
    items.push({
      label: 'Labels',
      icon: 'i-lucide-tag',
      children: labels.value.map((label) => ({
        label: label.name,
        type: 'checkbox' as const,
        checked: attendee.labels.some((item) => item.id === label.id),
        onUpdateChecked: (isChecked: boolean) =>
          toggleLabel(attendee, label.id, isChecked),
        // Keep the menu open so several labels can be toggled in a row.
        onSelect: (event: Event) => event.preventDefault(),
        slot: 'label-item' as const,
        labelColor: label.color,
      })),
    });
  }

  return [items];
}
</script>

<template>
  <div class="flex flex-col">
    <div class="flex flex-col gap-6">
      <UInput
        v-model="searchQuery"
        placeholder="Search members by name, keywords, or role"
        trailing-icon="i-lucide-search"
        color="neutral"
        variant="soft"
        class="w-full"
        :ui="{
          base: 'h-10 rounded-full border-0 bg-raised px-5 text-sm font-medium text-ink ring-0 placeholder:text-subtle focus-visible:ring-0',
          trailing: 'pe-4',
          trailingIcon: 'size-4 text-subtle',
        }"
      />

      <div
        class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="flex gap-8 overflow-x-auto px-5">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            type="button"
            class="shrink-0 cursor-pointer border-b pb-1 text-sm font-medium leading-5 whitespace-nowrap transition-colors"
            :class="
              activeTab === tab.value
                ? 'border-ink text-ink'
                : 'border-transparent text-subtle hover:text-ink'
            "
            @click="activeTab = tab.value"
          >
            {{ tab.label }}
          </button>
        </div>

        <div class="flex items-center gap-2">
          <UTooltip text="Filter by label">
            <UiLabelSelect
              v-model="selectedLabelIds"
              :labels="labels ?? []"
              placeholder="All labels"
              :manageable="canManageLabels"
              aria-label="Filter by label"
              class="min-w-0 flex-1 sm:w-52 sm:flex-none"
              :ui="filterSelectUi"
              @manage="isLabelsOpen = true"
            />
          </UTooltip>
          <UTooltip text="Group by label">
            <UButton
              icon="i-lucide-rows-3"
              label="Group"
              color="neutral"
              variant="ghost"
              class="h-9 shrink-0 cursor-pointer gap-1.5 rounded-full px-3.5 text-sm font-medium ring-1 ring-inset ring-raised hover:bg-raised"
              :ui="{ leadingIcon: 'size-4' }"
              :class="isGrouped ? 'bg-raised text-ink' : 'text-muted'"
              :aria-pressed="isGrouped"
              aria-label="Group by label"
              @click="toggleGrouping"
            />
          </UTooltip>
          <UTooltip v-if="canExport" text="Export registered attendees">
            <UButton
              icon="i-lucide-download"
              color="neutral"
              variant="ghost"
              class="flex h-9 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full p-0 text-muted ring-1 ring-inset ring-raised hover:bg-raised"
              :ui="{ leadingIcon: 'size-4' }"
              aria-label="Export registered attendees"
              @click="emit('export')"
            />
          </UTooltip>
        </div>
      </div>
    </div>

    <div
      class="hide-scrollbar shrink-0 overflow-x-auto overflow-y-hidden pt-2 pb-6"
    >
      <UTable
        :data="rows"
        :columns="columns"
        :meta="{
          class: {
            tr: (row) => (row.original.group ? 'bg-raised/40' : ''),
          },
        }"
        :ui="{
          th: 'px-4 py-4 border-b border-raised text-xs font-medium tracking-wide uppercase text-ink',
          td: 'px-4 py-4 border-b border-raised text-sm',
          tr: 'bg-transparent',
          empty: 'py-16 text-center text-sm text-muted',
        }"
        class="w-full min-w-200"
      >
        <template #name-cell="{ row }">
          <UiLabelGroupHeader
            v-if="row.original.group"
            :label="row.original.group.label"
            :count="row.original.group.items.length"
            :collapsed="collapsedGroupKeys.includes(row.original.key)"
            @toggle="toggleGroup(row.original.key)"
          />
          <div v-else class="flex flex-col gap-0.5">
            <span class="font-medium text-ink">{{
              row.original.item.name
            }}</span>
            <span class="text-xs text-subtle">{{
              row.original.item.role
            }}</span>
          </div>
        </template>
        <template #company-cell="{ row }">
          <span v-if="row.original.item" class="text-subtle">{{
            row.original.item.company
          }}</span>
        </template>
        <template #email-cell="{ row }">
          <span v-if="row.original.item" class="text-subtle">{{
            row.original.item.email || '—'
          }}</span>
        </template>
        <template #status-cell="{ row }">
          <span v-if="row.original.item" class="text-subtle">{{
            attendeeStatusLabel(row.original.item)
          }}</span>
        </template>
        <template #labels-cell="{ row }">
          <UiLabelDots
            v-if="row.original.item"
            :labels="row.original.item.labels"
          />
        </template>
        <template #actions-cell="{ row }">
          <UDropdownMenu
            v-if="row.original.item"
            :items="getActionItems(row.original.item)"
            :ui="{
              item: 'items-center',
              itemLeadingIcon: 'size-4',
              itemTrailingIcon: 'size-4',
            }"
          >
            <UTooltip :text="`Actions for ${row.original.item.name}`">
              <UButton
                size="xl"
                icon="i-mdi-dots-vertical"
                color="neutral"
                variant="ghost"
                class="text-muted"
                :aria-label="`Actions for ${row.original.item.name}`"
              />
            </UTooltip>
            <template #label-item-leading="{ item }">
              <span
                class="size-2.5 shrink-0 rounded-full ring-1 ring-inset ring-ink/15"
                :style="{
                  backgroundColor: (item as DropdownMenuItem).labelColor,
                }"
              />
            </template>
          </UDropdownMenu>
        </template>
      </UTable>
    </div>

    <div v-if="!isGrouped" class="flex items-center justify-end pt-2">
      <UPagination
        v-model:page="page"
        :total="total"
        :items-per-page="itemsPerPage"
        show-controls
        show-edges
        color="neutral"
        variant="outline"
      />
    </div>

    <EventAttendeeLabelsSlideover
      v-if="canManageLabels"
      v-model:open="isLabelsOpen"
      :organization-slug="organizationSlug"
    />
  </div>
</template>
