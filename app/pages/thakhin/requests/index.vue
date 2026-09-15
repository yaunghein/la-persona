<script setup lang="ts">
definePageMeta({
  layout: 'thakhin',
});

import type { DropdownMenuItem, TableColumn } from '@nuxt/ui';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { useThakhinTable } from '~/composables/thakhin-table';
import {
  THAKHIN_ACTIONS_COLUMN,
  THAKHIN_TABLE_UI,
  thakhinSortableHeader,
} from '~/utils/thakhin-table';

type CardRequestRow = {
  id: string;
  type: 'new_design' | 'existing_design';
  status: string;
  paymentReceiptUrl: string;
  cardData: {
    name?: string;
    position?: string;
    company?: string;
    phone?: string;
    email?: string;
    website?: string;
    sourceCardId?: string;
  };
  requesterName: string | null;
  requesterEmail: string | null;
  createdAt: string;
  updatedAt: string;
};

const toast = useToast();
const runtimeConfig = useRuntimeConfig();
const queryClient = useQueryClient();

const { data, isLoading: pending } = useQuery({
  queryKey: QUERY_KEYS.cardRequests,
  queryFn: () => $fetch<CardRequestRow[]>('/api/card-requests'),
});

const rows = computed(() => data.value || []);

const filterName = ref('');
const filterEmail = ref('');
const filterType = ref<'all' | 'new_design' | 'existing_design'>('all');
const filterStatus = ref<'all' | 'pending' | 'approved' | 'declined'>('all');

function getS3Url(path?: string | null) {
  if (!path) return '';
  if (path.startsWith('http')) return path;

  const bucket = runtimeConfig.public.awsBucketName;
  const region = runtimeConfig.public.awsRegion;
  const normalizedPath = path.replace(/^\/+/, '');
  return `https://${bucket}.s3.${region}.amazonaws.com/${normalizedPath}`;
}

const filteredRows = computed(() => {
  return rows.value.filter((row) => {
    const requesterName = (row.requesterName || '').toLowerCase();
    const requesterEmail = (row.requesterEmail || '').toLowerCase();

    const matchesName =
      !filterName.value.trim() ||
      requesterName.includes(filterName.value.trim().toLowerCase());

    const matchesEmail =
      !filterEmail.value.trim() ||
      requesterEmail.includes(filterEmail.value.trim().toLowerCase());

    const matchesType =
      filterType.value === 'all' || row.type === filterType.value;

    const matchesStatus =
      filterStatus.value === 'all' || row.status === filterStatus.value;

    return matchesName && matchesEmail && matchesType && matchesStatus;
  });
});

const {
  globalFilter,
  sorting,
  pagination,
  paginationOptions,
  paginationTotal,
  resetPage,
  onPageChange,
} = useThakhinTable(() => filteredRows.value.length);

watch([filterName, filterEmail, filterType, filterStatus], resetPage);

function typeLabel(type: CardRequestRow['type']) {
  return type === 'existing_design' ? 'Existing Design' : 'New Design';
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function statusColor(status: string) {
  if (status === 'approved') return 'success';
  if (status === 'declined') return 'error';
  return 'warning';
}

async function approveRequest(row: CardRequestRow) {
  try {
    await $fetch(`/api/card-requests/${row.id}/approve`, { method: 'POST' });
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cardRequests });
    toast.add({
      title: 'Request approved',
      description: `${row.cardData?.name || 'Request'} is now approved.`,
      color: 'success',
    });
  } catch (error: any) {
    toast.add({
      title: 'Approve failed',
      description:
        error?.data?.statusMessage || error?.message || 'Please try again.',
      color: 'error',
    });
  }
}

function declineComingSoon() {
  toast.add({
    title: 'Decline coming soon',
    description: 'Decline flow will be implemented next.',
    color: 'warning',
  });
}

function getActionItems(row: CardRequestRow): DropdownMenuItem[][] {
  if (row.status !== 'pending') {
    return [
      [
        {
          label: 'No actions available',
          icon: 'i-lucide-info',
          disabled: true,
        },
      ],
    ];
  }

  return [
    [
      {
        label: 'Approve',
        icon: 'i-lucide-check',
        onSelect: () => approveRequest(row),
      },
      {
        label: 'Decline',
        icon: 'i-lucide-x',
        color: 'error',
        onSelect: declineComingSoon,
      },
    ],
  ];
}

const columns: TableColumn<CardRequestRow>[] = [
  { accessorKey: 'id', header: thakhinSortableHeader('REQUEST ID') },
  {
    accessorKey: 'requesterName',
    header: thakhinSortableHeader('REQUESTER'),
  },
  { accessorKey: 'requesterEmail', header: thakhinSortableHeader('EMAIL') },
  { accessorKey: 'type', header: thakhinSortableHeader('TYPE') },
  {
    accessorKey: 'cardData.name',
    id: 'cardName',
    header: thakhinSortableHeader('CARD NAME'),
    accessorFn: (row) => row.cardData?.name || '',
  },
  {
    accessorKey: 'paymentReceiptUrl',
    header: 'RECEIPT',
    enableSorting: false,
    enableGlobalFilter: false,
  },
  { accessorKey: 'status', header: thakhinSortableHeader('STATUS') },
  { accessorKey: 'createdAt', header: thakhinSortableHeader('CREATED AT') },
  THAKHIN_ACTIONS_COLUMN,
];
</script>

<template>
  <div class="flex min-h-[calc(100dvh-11rem)] flex-col gap-6">
    <h1
      class="text-[1.75rem] font-normal leading-tight tracking-widest uppercase"
    >
      Card Requests
    </h1>

    <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
      <UInput
        v-model="globalFilter"
        placeholder="Search requests..."
        icon="i-lucide-search"
        size="xl"
      />
      <UInput
        v-model="filterName"
        placeholder="Filter requester..."
        size="xl"
      />
      <UInput v-model="filterEmail" placeholder="Filter email..." size="xl" />
      <USelect
        v-model="filterType"
        size="xl"
        :items="[
          { label: 'All Types', value: 'all' },
          { label: 'New Design', value: 'new_design' },
          { label: 'Existing Design', value: 'existing_design' },
        ]"
      />
      <USelect
        v-model="filterStatus"
        size="xl"
        :items="[
          { label: 'All Status', value: 'all' },
          { label: 'Pending', value: 'pending' },
          { label: 'Approved', value: 'approved' },
          { label: 'Declined', value: 'declined' },
        ]"
      />
    </div>

    <div class="hide-scrollbar flex-1 overflow-x-auto overflow-y-hidden">
      <UTable
        ref="table"
        v-model:global-filter="globalFilter"
        v-model:sorting="sorting"
        v-model:pagination="pagination"
        :data="filteredRows"
        :columns="columns"
        :loading="pending"
        :pagination-options="paginationOptions"
        :get-row-id="(row) => row.id"
        :ui="THAKHIN_TABLE_UI"
        class="w-full min-w-275"
      >
        <template #requesterName-cell="{ row }">
          <span class="text-white font-medium">
            {{ row.original.requesterName || '-' }}
          </span>
        </template>

        <template #type-cell="{ row }">
          {{ typeLabel(row.original.type) }}
        </template>

        <template #cardName-cell="{ row }">
          {{ row.original.cardData?.name || '-' }}
        </template>

        <template #paymentReceiptUrl-cell="{ row }">
          <UButton
            size="xl"
            v-if="row.original.paymentReceiptUrl"
            label="View Receipt"
            icon="i-lucide-external-link"
            color="neutral"
            variant="link"
            class="px-0"
            :to="getS3Url(row.original.paymentReceiptUrl)"
            target="_blank"
          />
          <span v-else>-</span>
        </template>

        <template #status-cell="{ row }">
          <UBadge
            :color="statusColor(row.original.status)"
            variant="soft"
            class="uppercase"
          >
            {{ row.original.status }}
          </UBadge>
        </template>

        <template #createdAt-cell="{ row }">
          {{ formatDate(row.original.createdAt) }}
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

    <div class="mt-auto flex items-center justify-end pt-4">
      <UPagination
        :page="pagination.pageIndex + 1"
        :total="paginationTotal"
        :items-per-page="pagination.pageSize"
        @update:page="onPageChange"
        show-controls
        show-edges
        color="neutral"
        variant="outline"
      />
    </div>
  </div>
</template>
