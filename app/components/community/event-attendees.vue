<script setup lang="ts">
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui';
import type { EventAttendee } from '~~/shared/types/community-event-detail';

const props = defineProps<{
  attendees: EventAttendee[];
}>();

const emit = defineEmits<{
  select: [attendee: EventAttendee];
}>();

type AttendeeTab = 'all' | 'registered' | 'checked_in';

const searchQuery = ref('');
const activeTab = ref<AttendeeTab>('all');
const page = ref(1);
const itemsPerPage = 10;

const tabCounts = computed(() => ({
  all: props.attendees.length,
  registered: props.attendees.filter((a) => a.status === 'registered').length,
  checkedIn: props.attendees.filter((a) => a.status === 'checked_in').length,
}));

const tabs = computed(() => [
  { label: `Total (${tabCounts.value.all})`, value: 'all' as const },
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

    if (!query) return true;

    return (
      attendee.name.toLowerCase().includes(query) ||
      attendee.role.toLowerCase().includes(query) ||
      attendee.company.toLowerCase().includes(query) ||
      attendee.statusLabel.toLowerCase().includes(query) ||
      (attendee.email || '').toLowerCase().includes(query)
    );
  });
});

const total = computed(() => filteredAttendees.value.length);
const pagedAttendees = computed(() => {
  const start = (page.value - 1) * itemsPerPage;
  return filteredAttendees.value.slice(start, start + itemsPerPage);
});

watch([searchQuery, activeTab], () => {
  page.value = 1;
});

watch(filteredAttendees, () => {
  const maxPage = Math.max(1, Math.ceil(total.value / itemsPerPage));
  if (page.value > maxPage) page.value = maxPage;
});

const columns: TableColumn<EventAttendee>[] = [
  { accessorKey: 'name', header: 'NAME' },
  { accessorKey: 'company', header: 'COMPANY' },
  { accessorKey: 'email', header: 'EMAIL' },
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
          base: 'h-10 rounded-full border-0 bg-[#232323] px-5 text-sm font-medium text-white ring-0 placeholder:text-[#8b8b8b] focus-visible:ring-0',
          trailing: 'pe-4',
          trailingIcon: 'size-4 text-[#8b8b8b]',
        }"
      />

      <div class="flex gap-8 overflow-x-auto px-5">
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

    <div
      class="hide-scrollbar shrink-0 overflow-x-auto overflow-y-hidden pt-2 pb-6"
    >
      <UTable
        :data="pagedAttendees"
        :columns="columns"
        :ui="{
          th: 'px-4 py-4 border-b border-[#232323] text-xs font-medium tracking-wide uppercase text-white',
          td: 'px-4 py-4 border-b border-[#232323] text-sm',
          tr: 'bg-transparent',
          empty: 'py-16 text-center text-sm text-muted',
        }"
        class="w-full min-w-200"
      >
        <template #name-cell="{ row }">
          <div class="flex flex-col gap-0.5">
            <span class="font-medium text-white">{{ row.original.name }}</span>
            <span class="text-xs text-[#8b8b8b]">{{ row.original.role }}</span>
          </div>
        </template>
        <template #company-cell="{ row }">
          <span class="text-[#8b8b8b]">{{ row.original.company }}</span>
        </template>
        <template #email-cell="{ row }">
          <span class="text-[#8b8b8b]">{{ row.original.email || '—' }}</span>
        </template>
        <template #status-cell="{ row }">
          <span class="text-[#8b8b8b]">{{ row.original.statusLabel }}</span>
        </template>
        <template #actions-cell="{ row }">
          <UDropdownMenu :items="getActionItems(row.original)">
            <UButton
              size="xl"
              icon="i-mdi-dots-vertical"
              color="neutral"
              variant="ghost"
              class="text-muted"
            />
          </UDropdownMenu>
        </template>
      </UTable>
    </div>

    <div class="flex items-center justify-end pt-2">
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
