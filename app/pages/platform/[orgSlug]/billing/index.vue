<script setup lang="ts">
definePageMeta({
  layout: 'platform',
});

import type { DropdownMenuItem, TableColumn } from '@nuxt/ui';

type BillingRow = {
  id: string;
  paymentId: string;
  dueDate: string;
  description: string;
  status: string;
  amountMinor: number;
  currency: string;
  startAt: string;
  endAt: string;
  createdAt: string;
  updatedAt: string;
};

type BillingTableRow = {
  id: string;
  dueDate: string;
  description: string;
  status: string;
  total: string;
  action: string;
};

const route = useRoute();
const router = useRouter();
const toast = useToast();

const parseViewMode = (value: unknown): 'list' | 'grid' =>
  value === 'grid' ? 'grid' : 'list';
const parseSortOrder = (value: unknown): 'desc' | 'asc' =>
  value === 'asc' ? 'asc' : 'desc';
const parsePage = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
};

const viewMode = ref<'list' | 'grid'>(parseViewMode(route.query.view));
const sortOrder = ref<'desc' | 'asc'>(parseSortOrder(route.query.sort));
const page = ref(parsePage(route.query.page));

const { data, pending, refresh } = await useFetch<BillingRow[]>(
  '/api/subscriptions/billing'
);

const rows = computed(() => data.value || []);

const sortedRows = computed(() => {
  const direction = sortOrder.value === 'asc' ? 1 : -1;
  return [...rows.value].sort((a, b) => {
    const aTime = new Date(a.dueDate).getTime();
    const bTime = new Date(b.dueDate).getTime();
    return (aTime - bTime) * direction;
  });
});

const listItemsPerPage = 10;
const gridItemsPerPage = 6;
const itemsPerPage = computed(() =>
  viewMode.value === 'grid' ? gridItemsPerPage : listItemsPerPage
);
const total = computed(() => sortedRows.value.length);
const hasRows = computed(() => total.value > 0);
const maxPage = computed(() =>
  Math.max(1, Math.ceil(total.value / itemsPerPage.value))
);

const pagedRows = computed(() => {
  const start = (page.value - 1) * itemsPerPage.value;
  return sortedRows.value.slice(start, start + itemsPerPage.value);
});

const tableRows = computed<BillingTableRow[]>(() =>
  pagedRows.value.map((row) => ({
    id: row.id,
    dueDate: formatDate(row.dueDate),
    description: row.description,
    status: getStatusLabel(row.status),
    total: formatMoney(row.amountMinor, row.currency),
    action: 'download',
  }))
);

const columns: TableColumn<BillingTableRow>[] = [
  {
    accessorKey: 'dueDate',
    header: 'DUE DATE',
    meta: {
      class: {
        th: 'text-sm font-medium uppercase tracking-widest text-white',
        td: 'text-sm font-medium text-muted',
      },
    },
  },
  {
    accessorKey: 'description',
    header: 'DESCRIPTION',
    meta: {
      class: {
        th: 'text-sm font-medium uppercase tracking-widest text-white',
        td: 'text-sm font-medium text-muted',
      },
    },
  },
  {
    accessorKey: 'status',
    header: 'STATUS',
    meta: {
      class: {
        th: 'text-sm font-medium uppercase tracking-widest text-white',
        td: 'text-sm font-medium text-muted',
      },
    },
  },
  {
    accessorKey: 'total',
    header: 'TOTAL',
    meta: {
      class: {
        th: 'text-sm font-medium uppercase tracking-widest text-white',
        td: 'text-sm font-medium text-muted',
      },
    },
  },
  {
    id: 'action',
    accessorKey: 'action',
    header: '',
    meta: {
      class: {
        th: 'w-10',
        td: 'text-right',
      },
    },
  },
];

const sortMenuItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: 'Newest first',
      icon: 'i-lucide-arrow-down',
      disabled: sortOrder.value === 'desc',
      onSelect: () => (sortOrder.value = 'desc'),
    },
    {
      label: 'Oldest first',
      icon: 'i-lucide-arrow-up',
      disabled: sortOrder.value === 'asc',
      onSelect: () => (sortOrder.value = 'asc'),
    },
  ],
]);

const sortLabel = computed(() =>
  sortOrder.value === 'desc' ? 'Newest first' : 'Oldest first'
);

const setViewMode = (mode: 'list' | 'grid') => {
  if (viewMode.value === mode) return;
  viewMode.value = mode;
  page.value = 1;
};

const toggleViewMode = () => {
  setViewMode(viewMode.value === 'list' ? 'grid' : 'list');
};

const onDownload = () => {
  toast.add({
    title: 'Download is coming soon',
    description:
      'Invoice download action will be available in a future update.',
    color: 'neutral',
  });
};

watch(
  () => route.query,
  (query) => {
    const nextView = parseViewMode(query.view);
    const nextSort = parseSortOrder(query.sort);
    const nextPage = parsePage(query.page);
    if (viewMode.value !== nextView) viewMode.value = nextView;
    if (sortOrder.value !== nextSort) sortOrder.value = nextSort;
    if (page.value !== nextPage) page.value = nextPage;
  }
);

watch([viewMode, sortOrder], () => {
  page.value = 1;
});

watch([viewMode, sortOrder, page, maxPage], async () => {
  if (page.value > maxPage.value) {
    page.value = maxPage.value;
    return;
  }

  const nextView = viewMode.value;
  const nextSort = sortOrder.value;
  const nextPage = String(page.value);
  const currentView = parseViewMode(route.query.view);
  const currentSort = parseSortOrder(route.query.sort);
  const currentPage = String(parsePage(route.query.page));

  if (
    currentView === nextView &&
    currentSort === nextSort &&
    currentPage === nextPage
  ) {
    return;
  }

  await router.replace({
    query: {
      ...route.query,
      view: nextView,
      sort: nextSort,
      page: nextPage,
    },
  });
});

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatMoney(amountMinor: number, currency: string) {
  return `${amountMinor.toLocaleString()} ${currency || 'MMK'}`;
}

function getStatusLabel(status: string) {
  if (status === 'approved') return 'Paid';
  if (status === 'rejected') return 'Rejected';
  return 'Pending';
}
</script>

<template>
  <div class="flex min-h-[calc(100dvh-7rem)] flex-col gap-8">
    <div
      class="relative flex flex-col gap-3 pb-5 sm:flex-row sm:items-center sm:justify-between sm:pr-0"
    >
      <h1 class="text-2xl font-medium leading-tight tracking-widest uppercase">
        Billing & Subscription
      </h1>

      <UButton
        icon="material-symbols:list-alt-outline-sharp"
        color="neutral"
        variant="ghost"
        class="fixed top-3.75 right-4 z-20 flex items-center justify-center sm:hidden cursor-pointer text-muted"
        :aria-label="viewMode === 'list' ? 'Switch to grid view' : 'Switch to list view'"
        @click="toggleViewMode"
      />

      <div class="hidden items-center gap-2 sm:flex">
        <UFieldGroup>
          <UButton
            size="xl"
            icon="i-lucide-table-2"
            class="cursor-pointer size-9 rounded-l-md border-2 border-[#232323] p-0 flex items-center justify-center hover:bg-[#232323]"
            aria-label="List view"
            :variant="viewMode === 'list' ? 'solid' : 'ghost'"
            :class="
              viewMode === 'list' ? 'bg-[#232323] text-white' : 'text-muted'
            "
            @click="setViewMode('list')"
          />
          <UButton
            size="xl"
            icon="i-lucide-layout-grid"
            class="cursor-pointer size-9 rounded-r-md border-2 border-[#232323] p-0 flex items-center justify-center hover:bg-[#232323]"
            aria-label="Grid view"
            :variant="viewMode === 'grid' ? 'solid' : 'ghost'"
            :class="
              viewMode === 'grid' ? 'bg-[#232323] text-white' : 'text-muted'
            "
            @click="setViewMode('grid')"
          />
        </UFieldGroup>
      </div>
    </div>

    <div v-if="pending" class="flex-1 space-y-3">
      <USkeleton
        v-for="index in 5"
        :key="index"
        class="h-16 w-full rounded-md"
      />
    </div>

    <div
      v-else-if="!hasRows"
      class="flex flex-1 flex-col items-center justify-center gap-4"
    >
      <UIcon name="i-lucide-receipt-text" class="size-8 text-muted" />
      <h2 class="text-base font-medium uppercase tracking-widest text-white">
        No billing records yet
      </h2>
      <p class="max-w-[20rem] text-center text-sm text-muted">
        Your subscription and billing history will appear here once payments are
        available.
      </p>
    </div>

    <template v-else>
      <div
        v-if="viewMode === 'list'"
        class="hide-scrollbar flex-1 overflow-x-auto overflow-y-hidden"
      >
        <UTable
          :data="tableRows"
          :columns="columns"
          :ui="{
            th: 'px-4 py-4 border-b border-[#232323]',
            td: 'px-4 py-4 border-b border-[#232323]',
            tr: 'bg-transparent',
            empty: 'py-16 text-center text-sm text-muted',
          }"
          class="w-full min-w-[980px]"
        >
          <template #action-cell>
            <UButton
              size="xl"
              icon="i-material-symbols-download-sharp"
              color="neutral"
              variant="ghost"
              class="cursor-pointer p-0 text-muted hover:text-white"
              @click="onDownload"
            />
          </template>
        </UTable>
      </div>

      <div v-else class="flex-1">
        <div class="mb-4 hidden">
          <UDropdownMenu :items="sortMenuItems">
            <UButton
              size="xl"
              :label="`Date: ${sortLabel}`"
              icon="i-lucide-calendar-days"
              trailing-icon="i-lucide-chevron-down"
              color="neutral"
              variant="ghost"
              class="h-9 rounded-full border border-[#232323] bg-[#171717] px-4 text-muted hover:bg-[#232323]"
            />
          </UDropdownMenu>
        </div>

        <div class="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
          <UCard
            v-for="row in pagedRows"
            :key="row.id"
            :ui="{
              root: 'rounded-[8px] bg-[#171717] border border-transparent',
              body: 'p-0!',
            }"
          >
            <div class="p-5">
              <p class="text-sm font-medium text-muted">
                {{ formatDate(row.dueDate) }}
              </p>
              <p class="mt-1 text-xl font-medium leading-tight text-white">
                {{ row.description }}
              </p>
            </div>

            <div class="border-t-2 border-[#232323] px-5 py-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-xs text-muted">
                    {{ getStatusLabel(row.status) }}
                  </p>
                  <p class="mt-1 text-sm text-white">
                    {{ formatMoney(row.amountMinor, row.currency) }}
                  </p>
                </div>

                <UButton
                  size="xl"
                  icon="i-material-symbols-download-sharp"
                  color="neutral"
                  variant="ghost"
                  class="cursor-pointer p-0 text-muted hover:text-white"
                  @click="onDownload"
                />
              </div>
            </div>
          </UCard>
        </div>
      </div>

      <div class="mt-auto flex items-center justify-end pt-4">
        <UPagination
          v-model:page="page"
          :total="total"
          :items-per-page="itemsPerPage"
          show-controls
          show-edges
          color="neutral"
          variant="outline"
          active-color="neutral"
          active-variant="solid"
          first-icon="i-lucide-chevrons-left"
          prev-icon="i-lucide-chevron-left"
          next-icon="i-lucide-chevron-right"
          last-icon="i-lucide-chevrons-right"
        />
      </div>
    </template>
  </div>
</template>
