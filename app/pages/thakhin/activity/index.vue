<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';
import { format } from 'date-fns';
import {
  ADMIN_TABLE_UI,
  sortableHeader,
} from '~/features/admin/utils/admin-table';
import {
  ADMIN_FILTER_UI,
  ADMIN_GHOST_BUTTON_CLASS,
  ADMIN_PAGE_CLASS,
  ADMIN_SEARCH_UI,
  ADMIN_SLIDEOVER_UI,
  ADMIN_TABS_UI,
  type AdminPillTone,
} from '~/features/admin/utils/admin-ui';
import type {
  AdminActivityQuery,
  AdminPersonActivity,
  AdminPersonEventActivity,
  AdminRevenueRange,
} from '~~/shared/contracts/admin';
import type { ContactSource } from '~~/shared/contracts/contact';
import { formatDateLabel } from '~~/shared/utils/datetime';

definePageMeta({
  layout: 'thakhin',
});

type ActivityRow = AdminPersonActivity & { connectionsPerEvent: number };
type Engagement = 'all' | 'connected' | 'silent' | 'attended-silent';

const toast = useToast();
const range = useQueryState<AdminRevenueRange>('range', 'all');
const organizationFilter = useQueryState('organization', 'all');
const eventFilter = useQueryState('event', 'all');
const sourceFilter = useQueryState<ContactSource | 'all'>('source', 'all');
const engagement = useQueryState<Engagement>('engagement', 'all');

const RANGE_ITEMS: { label: string; value: AdminRevenueRange }[] = [
  { label: '1W', value: '1w' },
  { label: '1M', value: '1m' },
  { label: '3M', value: '3m' },
  { label: '6M', value: '6m' },
  { label: '1Y', value: '1y' },
  { label: 'All', value: 'all' },
];
const SOURCE_ITEMS: { label: string; value: ContactSource | 'all' }[] = [
  { label: 'All sources', value: 'all' },
  { label: 'Seamless exchange', value: 'seamless_exchange' },
  { label: 'Public form', value: 'public_form' },
  { label: 'Added manually', value: 'manual' },
];
const ENGAGEMENT_ITEMS: { label: string; value: Engagement }[] = [
  { label: 'Everyone', value: 'all' },
  { label: 'Made connections', value: 'connected' },
  { label: 'No connections', value: 'silent' },
  { label: 'Attended, no connections', value: 'attended-silent' },
];

const filter = computed<AdminActivityQuery>(() => ({
  range: range.value,
  organizationId:
    organizationFilter.value === 'all' ? undefined : organizationFilter.value,
  eventId: eventFilter.value === 'all' ? undefined : eventFilter.value,
  source: sourceFilter.value === 'all' ? undefined : sourceFilter.value,
}));

const { data, isLoading, isFetching } = useAdminActivityQuery(filter);
const { data: organizations } = useAdminOrganizationsQuery();
const { data: events } = useAdminEventsQuery();

const organizationItems = computed(() => [
  { label: 'All organizations', value: 'all' },
  ...(organizations.value ?? [])
    .filter((item) => item.type !== 'personal')
    .map((item) => ({ label: item.name, value: item.id })),
]);
const eventItems = computed(() => [
  { label: 'All events', value: 'all' },
  ...(events.value ?? [])
    .filter(
      (item) =>
        organizationFilter.value === 'all' ||
        item.organizationId === organizationFilter.value
    )
    .map((item) => ({
      label: `${item.title} · ${formatDateLabel(item.startsAt)}`,
      value: item.id,
    })),
]);

// An event from another organization would silently empty the table.
watch(organizationFilter, () => {
  if (
    eventFilter.value !== 'all' &&
    !eventItems.value.some((item) => item.value === eventFilter.value)
  )
    eventFilter.value = 'all';
});

const rows = computed<ActivityRow[]>(() =>
  (data.value ?? [])
    .filter((row) => {
      if (engagement.value === 'connected') return row.connections > 0;
      if (engagement.value === 'silent') return row.connections === 0;
      if (engagement.value === 'attended-silent')
        return row.eventsAttended > 0 && row.eventConnections === 0;
      return true;
    })
    .map((row) => ({
      ...row,
      connectionsPerEvent: row.eventsAttended
        ? Math.round((row.eventConnections / row.eventsAttended) * 10) / 10
        : 0,
    }))
);

const totals = computed(() => {
  const sum = (key: 'connections' | 'eventConnections' | 'eventsAttended') =>
    rows.value.reduce((total, row) => total + row[key], 0);
  const connections = sum('connections');
  const eventConnections = sum('eventConnections');
  const checkIns = sum('eventsAttended');
  return [
    {
      icon: 'i-material-symbols:group-outline-sharp',
      label: 'People',
      value: rows.value.length,
    },
    {
      icon: 'i-material-symbols:handshake-outline',
      label: 'Connections',
      value: connections,
    },
    {
      icon: 'i-material-symbols:event-available-outline-sharp',
      label: 'Check-ins',
      value: checkIns,
    },
    {
      icon: 'i-material-symbols:insights-sharp',
      label: 'Connections per check-in',
      value: checkIns ? (eventConnections / checkIns).toFixed(1) : '0',
    },
  ];
});

const {
  globalFilter,
  sorting,
  pagination,
  paginationOptions,
  paginationTotal,
  resetPage,
  onPageChange,
} = useAdminTable(() => rows.value.length, {
  defaultSort: [{ id: 'connections', desc: true }],
});

watch([filter, engagement], resetPage);

const columns: TableColumn<ActivityRow>[] = [
  { accessorKey: 'name', header: sortableHeader('PERSON') },
  { accessorKey: 'email', header: sortableHeader('EMAIL') },
  { accessorKey: 'connections', header: sortableHeader('CONNECTIONS') },
  { accessorKey: 'eventConnections', header: sortableHeader('AT EVENTS') },
  { accessorKey: 'eventsRegistered', header: sortableHeader('REGISTERED') },
  { accessorKey: 'eventsAttended', header: sortableHeader('ATTENDED') },
  {
    accessorKey: 'connectionsPerEvent',
    header: sortableHeader('PER EVENT'),
  },
  {
    accessorKey: 'lastConnectionAt',
    header: sortableHeader('LAST CONNECTION'),
  },
];

const selected = ref<ActivityRow | null>(null);
const detailOpen = computed({
  get: () => Boolean(selected.value),
  set: (open: boolean) => {
    if (!open) selected.value = null;
  },
});
const { data: personEvents, isLoading: isPersonEventsLoading } =
  usePersonEventActivityQuery(() => selected.value?.userId ?? null);

const STATUS_PILLS: Record<
  NonNullable<AdminPersonEventActivity['status']> | 'none',
  { label: string; tone: AdminPillTone }
> = {
  checked_in: { label: 'Attended', tone: 'success' },
  registered: { label: 'Registered', tone: 'info' },
  pending: { label: 'Pending', tone: 'warning' },
  none: { label: 'Not registered', tone: 'neutral' },
};

const isExporting = ref(false);
async function exportCsv() {
  isExporting.value = true;
  try {
    const blob = await downloadAdminActivityCsv(filter.value);
    downloadFile({
      blob,
      fileName: `people-activity-${format(new Date(), 'yyyy-MM-dd')}.csv`,
    });
  } catch {
    toast.add({
      title: 'Export failed',
      description: 'Please try again.',
      color: 'error',
    });
  } finally {
    isExporting.value = false;
  }
}
</script>

<template>
  <div :class="ADMIN_PAGE_CLASS">
    <AdminPageHeader
      title="Activity"
      description-class="max-w-115"
      description="Who makes connections, which events they attend, and how many people they meet at each&nbsp;one."
    >
      <UTabs
        v-model="range"
        :items="RANGE_ITEMS"
        :content="false"
        color="neutral"
        variant="pill"
        :ui="ADMIN_TABS_UI"
      />
      <UButton
        icon="i-lucide-download"
        label="Export CSV"
        color="neutral"
        variant="ghost"
        :loading="isExporting"
        :class="ADMIN_GHOST_BUTTON_CLASS"
        @click="exportCsv"
      />
    </AdminPageHeader>

    <div v-if="isLoading" class="grid grid-cols-2 gap-4 md:grid-cols-4">
      <USkeleton v-for="index in 4" :key="index" class="h-36 rounded-lg" />
    </div>
    <div
      v-else
      class="grid grid-cols-2 gap-4 transition-opacity md:grid-cols-4"
      :class="isFetching ? 'opacity-60' : ''"
    >
      <AdminStatTile v-for="tile in totals" :key="tile.label" v-bind="tile" />
    </div>

    <AdminTableFrame
      :page="pagination.pageIndex + 1"
      :total="paginationTotal"
      :items-per-page="pagination.pageSize"
      :loading="isLoading"
      @update:page="onPageChange"
    >
      <template #toolbar>
        <UInput
          v-model="globalFilter"
          icon="i-lucide-search"
          placeholder="Search name or email"
          color="neutral"
          variant="soft"
          class="w-full sm:w-64"
          :ui="ADMIN_SEARCH_UI"
        />
        <USelect
          v-model="organizationFilter"
          :items="organizationItems"
          class="w-full sm:w-52"
          :ui="ADMIN_FILTER_UI"
        />
        <USelect
          v-model="eventFilter"
          :items="eventItems"
          class="w-full sm:w-64"
          :ui="ADMIN_FILTER_UI"
        />
        <USelect
          v-model="sourceFilter"
          :items="SOURCE_ITEMS"
          class="w-full sm:w-44"
          :ui="ADMIN_FILTER_UI"
        />
        <USelect
          v-model="engagement"
          :items="ENGAGEMENT_ITEMS"
          class="w-full sm:w-56"
          :ui="ADMIN_FILTER_UI"
        />
      </template>

      <UTable
        ref="table"
        v-model:global-filter="globalFilter"
        v-model:sorting="sorting"
        v-model:pagination="pagination"
        :data="rows"
        :columns="columns"
        :pagination-options="paginationOptions"
        :get-row-id="(row) => row.userId"
        :ui="ADMIN_TABLE_UI"
        class="w-full min-w-5xl"
        @select="(_event, row) => (selected = row.original)"
      >
        <template #name-cell="{ row }">
          <span class="font-medium text-ink">{{ row.original.name }}</span>
        </template>
        <template #connections-cell="{ row }">
          <span class="font-medium tabular-nums text-ink">{{
            row.original.connections
          }}</span>
        </template>
        <template #lastConnectionAt-cell="{ row }">
          {{
            row.original.lastConnectionAt
              ? formatDateLabel(row.original.lastConnectionAt)
              : '—'
          }}
        </template>
      </UTable>
    </AdminTableFrame>

    <USlideover
      v-model:open="detailOpen"
      :title="selected?.name ?? 'Person'"
      :description="selected?.email"
      side="right"
      inset
      :ui="ADMIN_SLIDEOVER_UI"
    >
      <template #body>
        <div v-if="selected" class="flex flex-col gap-6">
          <div class="grid grid-cols-2 gap-3">
            <div class="rounded-lg bg-raised p-4">
              <p class="text-xs text-subtle">Connections</p>
              <p class="mt-1 text-xl font-medium text-ink">
                {{ selected.connections }}
              </p>
            </div>
            <div class="rounded-lg bg-raised p-4">
              <p class="text-xs text-subtle">Events attended</p>
              <p class="mt-1 text-xl font-medium text-ink">
                {{ selected.eventsAttended }}
              </p>
            </div>
          </div>

          <div>
            <p class="text-sm font-medium text-ink">Events, all&nbsp;time</p>
            <p class="mt-1 text-xs text-subtle">
              Connections counted at each event the person registered for or met
              people&nbsp;at.
            </p>
          </div>

          <div v-if="isPersonEventsLoading" class="flex flex-col gap-2">
            <USkeleton
              v-for="index in 4"
              :key="index"
              class="h-16 w-full rounded-md"
            />
          </div>
          <p
            v-else-if="!personEvents?.length"
            class="rounded-lg bg-raised p-6 text-center text-sm text-subtle"
          >
            No events&nbsp;yet.
          </p>
          <ul v-else class="flex flex-col gap-2">
            <li
              v-for="item in personEvents"
              :key="item.eventId"
              class="flex items-center justify-between gap-3 rounded-lg bg-raised px-4 py-3"
            >
              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-ink">
                  {{ item.title }}
                </p>
                <p class="truncate text-xs text-subtle">
                  {{ item.organizationName }} ·
                  {{ formatDateLabel(item.startsAt) }}
                </p>
                <AdminStatusPill
                  class="mt-2"
                  v-bind="STATUS_PILLS[item.status ?? 'none']"
                />
              </div>
              <div class="shrink-0 text-right">
                <p class="text-lg font-medium tabular-nums text-ink">
                  {{ item.connections }}
                </p>
                <p class="text-xs text-subtle">
                  {{ item.connections === 1 ? 'connection' : 'connections' }}
                </p>
              </div>
            </li>
          </ul>
        </div>
      </template>
    </USlideover>
  </div>
</template>
