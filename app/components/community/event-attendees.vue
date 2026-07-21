<script setup lang="ts">
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui';
import type { EventAttendee } from '~~/shared/types/community-event-detail';

const props = defineProps<{
  attendees: EventAttendee[];
}>();

const emit = defineEmits<{
  select: [attendee: EventAttendee];
}>();

type AttendeeTab = 'all' | 'registered' | 'check-in';

const searchQuery = ref('');
const statusFilter = ref('all');
const participationFilter = ref('all');
const activeTab = ref<AttendeeTab>('all');
const page = ref(1);
const itemsPerPage = 10;

const statusOptions = [
  { label: 'All Status', value: 'all' },
  { label: 'Registered', value: 'registered' },
  { label: 'Checked In', value: 'checked_in' },
];

const participationOptions = [
  { label: 'All Participation', value: 'all' },
  { label: 'Attended Events', value: 'attended' },
  { label: 'No Events', value: 'none' },
];

const tabCounts = computed(() => ({
  all: props.attendees.length,
  registered: props.attendees.filter((a) => a.status === 'registered').length,
  checkIn: props.attendees.filter((a) => a.status === 'checked_in').length,
}));

const tabs = computed(() => [
  { label: `All Members (${tabCounts.value.all})`, value: 'all' as const },
  {
    label: `Registered (${tabCounts.value.registered})`,
    value: 'registered' as const,
  },
  {
    label: `Check-in (${tabCounts.value.checkIn})`,
    value: 'check-in' as const,
  },
]);

const filteredAttendees = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();

  return props.attendees.filter((attendee) => {
    if (activeTab.value === 'registered' && attendee.status !== 'registered') {
      return false;
    }
    if (activeTab.value === 'check-in' && attendee.status !== 'checked_in') {
      return false;
    }

    if (statusFilter.value !== 'all' && attendee.status !== statusFilter.value) {
      return false;
    }

    if (participationFilter.value === 'attended' && attendee.eventsAttended < 1) {
      return false;
    }
    if (participationFilter.value === 'none' && attendee.eventsAttended > 0) {
      return false;
    }

    if (!query) return true;

    return (
      attendee.name.toLowerCase().includes(query) ||
      attendee.role.toLowerCase().includes(query) ||
      attendee.company.toLowerCase().includes(query) ||
      attendee.statusLabel.toLowerCase().includes(query)
    );
  });
});

const total = computed(() => filteredAttendees.value.length);
const pagedAttendees = computed(() => {
  const start = (page.value - 1) * itemsPerPage;
  return filteredAttendees.value.slice(start, start + itemsPerPage);
});

watch([searchQuery, statusFilter, participationFilter, activeTab], () => {
  page.value = 1;
});

watch(filteredAttendees, () => {
  const maxPage = Math.max(1, Math.ceil(total.value / itemsPerPage));
  if (page.value > maxPage) page.value = maxPage;
});

const columns: TableColumn<EventAttendee>[] = [
  { accessorKey: 'name', header: 'NAME' },
  { accessorKey: 'company', header: 'COMPANY' },
  { accessorKey: 'status', header: 'STATUS' },
  { id: 'actions', header: '' },
];

function getActionItems(attendee: EventAttendee): DropdownMenuItem[][] {
  return [
    [
      {
        label: 'View profile',
        icon: 'i-lucide-user',
        onSelect: () => emit('select', attendee),
      },
    ],
  ];
}

function onRowClick(attendee: EventAttendee) {
  emit('select', attendee);
}

const filterSelectUi = {
  base: 'h-9 min-w-40 rounded-full border border-[#232323] bg-transparent px-5 text-sm font-medium text-[#8b8b8b] ring-0 focus:ring-0',
  content: 'border border-[#2a2a2a] bg-[#171717]',
  item: 'text-white data-[highlighted]:bg-[#232323]',
  value: 'text-[#8b8b8b]',
  trailingIcon: 'text-[#8b8b8b]',
};
</script>

<template>
  <div class="flex flex-col">
    <div class="flex flex-col gap-6 border-b border-[#232323] pb-6">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <UInput
          v-model="searchQuery"
          placeholder="Search Attendees"
          trailing-icon="i-lucide-search"
          color="neutral"
          variant="soft"
          class="w-full flex-1"
          :ui="{
            base: 'h-9 rounded-full border-0 bg-[#232323] px-5 text-sm font-medium text-white ring-0 placeholder:text-[#8b8b8b] focus-visible:ring-0',
            trailing: 'pe-5',
            trailingIcon: 'size-6 text-[#8b8b8b]',
          }"
        />
        <div
          class="flex w-full flex-wrap items-center gap-2 sm:w-90.75 sm:flex-nowrap sm:shrink-0"
        >
          <USelect
            v-model="statusFilter"
            :items="statusOptions"
            color="neutral"
            class="min-w-0 flex-1"
            :ui="filterSelectUi"
          />
          <USelect
            v-model="participationFilter"
            :items="participationOptions"
            color="neutral"
            class="min-w-0 flex-1"
            :ui="filterSelectUi"
          />
        </div>
      </div>

      <div class="flex gap-8 overflow-x-auto pl-1">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          type="button"
          class="shrink-0 cursor-pointer border-b pb-1 text-sm font-medium leading-5 whitespace-nowrap transition-colors"
          :class="
            activeTab === tab.value
              ? 'border-white text-white'
              : 'border-transparent text-[#8b8b8b] hover:text-white'
          "
          @click="activeTab = tab.value"
        >
          {{ tab.label }}
        </button>
      </div>
    </div>

    <div class="hide-scrollbar flex-1 overflow-x-auto pt-2">
      <UTable
        :data="pagedAttendees"
        :columns="columns"
        :ui="{
          th: 'px-4 py-4 border-b border-[#232323] text-xs font-medium tracking-wide uppercase text-white',
          td: 'px-4 py-4 border-b border-[#232323] text-sm cursor-pointer',
          tr: 'bg-transparent hover:bg-[#171717]/50',
          empty: 'py-16 text-center text-sm text-muted',
        }"
        class="w-full min-w-150"
      >
        <template #name-cell="{ row }">
          <div
            class="flex cursor-pointer flex-col gap-0.5"
            @click="onRowClick(row.original)"
          >
            <span class="font-medium text-white">{{ row.original.name }}</span>
            <span class="text-sm text-[#8b8b8b]">{{ row.original.role }}</span>
          </div>
        </template>
        <template #company-cell="{ row }">
          <span class="text-[#8b8b8b]">{{ row.original.company }}</span>
        </template>
        <template #status-cell="{ row }">
          <span
            :class="
              row.original.status === 'checked_in'
                ? 'text-white'
                : 'text-[#8b8b8b]'
            "
          >
            {{ row.original.statusLabel }}
          </span>
        </template>
        <template #actions-cell="{ row }">
          <UDropdownMenu
            :items="getActionItems(row.original)"
            @click.stop
          >
            <UButton
              size="xl"
              icon="i-mdi-dots-vertical"
              color="neutral"
              variant="ghost"
              class="text-muted"
              @click.stop
            />
          </UDropdownMenu>
        </template>
      </UTable>
    </div>

    <div class="mt-6 flex items-center justify-end pt-2">
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
  </div>
</template>
