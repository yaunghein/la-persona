<script setup lang="ts">
definePageMeta({
  layout: 'thakhin',
});

import type { DropdownMenuItem, TableColumn } from '@nuxt/ui';
import { useThakhinTable } from '~/composables/thakhin-table';
import {
  THAKHIN_ACTIONS_COLUMN,
  THAKHIN_TABLE_UI,
  thakhinSortableHeader,
} from '~/utils/thakhin-table';

type PaymentRow = {
  id: string;
  organizationId: string;
  paidByUserId: string;
  payerName: string | null;
  payerEmail: string | null;
  receiptUrl: string;
  paymentReference: string | null;
  paymentMethod: string | null;
  status: string;
  note: string | null;
  linkedRequestId: string | null;
  linkedRequestStatus: string | null;
  itemCount: number;
  totalAmountMinor: number;
  currency: string | null;
  createdAt: string;
  updatedAt: string;
};

const toast = useToast();
const runtimeConfig = useRuntimeConfig();

const { data, pending, refresh } = await useFetch<PaymentRow[]>(
  '/api/subscriptions/payments'
);

const rows = ref<PaymentRow[]>([]);

watch(
  data,
  (value) => {
    rows.value = value || [];
  },
  { immediate: true }
);

const filterPayer = ref('');
const filterStatus = ref<'all' | 'submitted' | 'approved' | 'rejected'>('all');
const filterLink = ref<'all' | 'linked' | 'standalone'>('all');

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
    const payerName = (row.payerName || '').toLowerCase();
    const payerEmail = (row.payerEmail || '').toLowerCase();

    const matchesPayer =
      !filterPayer.value.trim() ||
      payerName.includes(filterPayer.value.trim().toLowerCase()) ||
      payerEmail.includes(filterPayer.value.trim().toLowerCase());

    const matchesStatus =
      filterStatus.value === 'all' || row.status === filterStatus.value;
    const matchesLink =
      filterLink.value === 'all' ||
      (filterLink.value === 'linked' && Boolean(row.linkedRequestId)) ||
      (filterLink.value === 'standalone' && !row.linkedRequestId);

    return matchesPayer && matchesStatus && matchesLink;
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

watch([filterPayer, filterStatus, filterLink], resetPage);

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function formatMoney(amountMinor: number, currency?: string | null) {
  const suffix = currency || 'MMK';
  return `${amountMinor.toLocaleString()} ${suffix}`;
}

function statusColor(status: string) {
  if (status === 'approved') return 'success';
  if (status === 'rejected') return 'error';
  return 'warning';
}

async function approvePayment(row: PaymentRow) {
  try {
    await $fetch(`/api/subscriptions/payments/${row.id}/approve`, {
      method: 'POST',
    });
    await refresh();
    toast.add({
      title: 'Payment approved',
      description: `${row.id} is now approved.`,
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

async function rejectPayment(row: PaymentRow) {
  try {
    await $fetch(`/api/subscriptions/payments/${row.id}/reject`, {
      method: 'POST',
      body: {},
    });
    await refresh();
    toast.add({
      title: 'Payment rejected',
      description: `${row.id} was marked rejected.`,
      color: 'success',
    });
  } catch (error: any) {
    toast.add({
      title: 'Reject failed',
      description:
        error?.data?.statusMessage || error?.message || 'Please try again.',
      color: 'error',
    });
  }
}

function cannotActOnLinkedPayment() {
  toast.add({
    title: 'Linked to a card request',
    description:
      'This payment is tied to a design request. Approve or reject it from the Requests flow.',
    color: 'warning',
  });
}

function getActionItems(row: PaymentRow): DropdownMenuItem[][] {
  if (row.status !== 'submitted') {
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
        disabled: Boolean(row.linkedRequestId),
        onSelect: () =>
          row.linkedRequestId
            ? cannotActOnLinkedPayment()
            : approvePayment(row),
      },
      {
        label: 'Reject',
        icon: 'i-lucide-x',
        disabled: Boolean(row.linkedRequestId),
        onSelect: () =>
          row.linkedRequestId ? cannotActOnLinkedPayment() : rejectPayment(row),
      },
    ],
  ];
}

const columns: TableColumn<PaymentRow>[] = [
  { accessorKey: 'id', header: thakhinSortableHeader('PAYMENT ID') },
  { accessorKey: 'payerName', header: thakhinSortableHeader('PAYER') },
  { accessorKey: 'payerEmail', header: thakhinSortableHeader('EMAIL') },
  { accessorKey: 'itemCount', header: thakhinSortableHeader('ITEMS') },
  {
    accessorKey: 'totalAmountMinor',
    header: thakhinSortableHeader('AMOUNT'),
  },
  {
    accessorKey: 'receiptUrl',
    header: 'RECEIPT',
    enableSorting: false,
    enableGlobalFilter: false,
  },
  {
    accessorKey: 'linkedRequestId',
    header: thakhinSortableHeader('LINKED REQUEST'),
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
      Subscription Payments
    </h1>

    <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      <UInput
        v-model="globalFilter"
        placeholder="Search payments..."
        icon="i-lucide-search"
        size="xl"
      />
      <UInput v-model="filterPayer" placeholder="Filter payer..." size="xl" />
      <USelect
        v-model="filterStatus"
        size="xl"
        :items="[
          { label: 'All Status', value: 'all' },
          { label: 'Submitted', value: 'submitted' },
          { label: 'Approved', value: 'approved' },
          { label: 'Rejected', value: 'rejected' },
        ]"
      />
      <USelect
        v-model="filterLink"
        size="xl"
        :items="[
          { label: 'All Payment Types', value: 'all' },
          { label: 'Linked to Request', value: 'linked' },
          { label: 'Standalone Payment', value: 'standalone' },
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
        <template #payerName-cell="{ row }">
          <span class="text-white font-medium">
            {{ row.original.payerName || '-' }}
          </span>
        </template>

        <template #itemCount-cell="{ row }">
          {{ row.original.itemCount }}
        </template>

        <template #totalAmountMinor-cell="{ row }">
          {{
            formatMoney(row.original.totalAmountMinor, row.original.currency)
          }}
        </template>

        <template #receiptUrl-cell="{ row }">
          <UButton
            size="xl"
            v-if="row.original.receiptUrl"
            label="View Receipt"
            icon="i-lucide-external-link"
            color="neutral"
            variant="link"
            class="px-0"
            :to="getS3Url(row.original.receiptUrl)"
            target="_blank"
          />
          <span v-else>-</span>
        </template>

        <template #linkedRequestId-cell="{ row }">
          <span v-if="row.original.linkedRequestId" class="text-white">
            {{ row.original.linkedRequestId }}
          </span>
          <span
            v-if="row.original.linkedRequestStatus"
            class="ml-2 text-[#8b8b8b]"
          >
            ({{ row.original.linkedRequestStatus }})
          </span>
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
