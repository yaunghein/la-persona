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
  items: {
    planCode: string;
    amountMinor: number;
    currency: string;
    startAt: string;
    endAt: string;
    cardId: string;
  }[];
  createdAt: string;
  updatedAt: string;
};

const toast = useToast();
const runtimeConfig = useRuntimeConfig();
const queryClient = useQueryClient();

const { data, isLoading: pending } = useQuery({
  queryKey: QUERY_KEYS.payments,
  queryFn: () => $fetch<PaymentRow[]>('/api/subscriptions/payments'),
});

const rows = computed(() => data.value || []);

const filterPayer = ref('');
const filterStatus = ref<'all' | 'submitted' | 'approved' | 'rejected'>('submitted');
const filterLink = ref<'all' | 'linked' | 'standalone'>('all');
const selectedPayment = ref<PaymentRow | null>(null);
const paymentOpen = ref(false);

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
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.payments });
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminOverview });
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
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.payments });
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminOverview });
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
  const view = {
    label: 'View',
    icon: 'i-lucide-eye',
    onSelect: () => {
      selectedPayment.value = row;
      paymentOpen.value = true;
    },
  };

  if (row.status !== 'submitted') {
    return [[view]];
  }

  return [
    [
      view,
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
    header: 'Receipt',
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
  <div class="flex flex-col gap-6">
    <ThakhinPageHeader
      title="Payments"
      description="Approve or reject standalone subscription payments. Payments tied to a design request are decided on Requests."
    />

    <ThakhinTableFrame
      :page="pagination.pageIndex + 1"
      :total="paginationTotal"
      :items-per-page="pagination.pageSize"
      @update:page="onPageChange"
    >
      <template #toolbar>
        <UInput
          v-model="globalFilter"
          placeholder="Search payments"
          icon="i-lucide-search"
          size="sm"
          class="w-56"
        />
        <UInput
          v-model="filterPayer"
          placeholder="Payer"
          size="sm"
          class="w-44"
        />
        <USelect
          v-model="filterStatus"
          size="sm"
          class="w-36"
          :items="[
            { label: 'Submitted', value: 'submitted' },
            { label: 'Approved', value: 'approved' },
            { label: 'Rejected', value: 'rejected' },
            { label: 'All statuses', value: 'all' },
          ]"
        />
        <USelect
          v-model="filterLink"
          size="sm"
          class="w-44"
          :items="[
            { label: 'All payments', value: 'all' },
            { label: 'Linked', value: 'linked' },
            { label: 'Standalone', value: 'standalone' },
          ]"
        />
      </template>

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
        class="w-full min-w-[48rem]"
        @select="(_event, row) => { selectedPayment = row.original; paymentOpen = true }"
      >
        <template #payerName-cell="{ row }">
          <span class="font-medium text-white">
            {{ row.original.payerName || '-' }}
          </span>
        </template>

        <template #itemCount-cell="{ row }">
          {{ row.original.itemCount }}
        </template>

        <template #totalAmountMinor-cell="{ row }">
          {{ formatMoney(row.original.totalAmountMinor, row.original.currency) }}
        </template>

        <template #receiptUrl-cell="{ row }">
          <UButton
            v-if="row.original.receiptUrl"
            size="sm"
            label="Receipt"
            icon="i-lucide-external-link"
            color="neutral"
            variant="link"
            class="px-0"
            :to="getS3Url(row.original.receiptUrl)"
            target="_blank"
          />
          <span v-else class="text-white/35">—</span>
        </template>

        <template #linkedRequestId-cell="{ row }">
          <span v-if="row.original.linkedRequestId" class="text-white/80">
            {{ row.original.linkedRequestId }}
            <span
              v-if="row.original.linkedRequestStatus"
              class="text-white/40"
            >
              · {{ row.original.linkedRequestStatus }}
            </span>
          </span>
          <span v-else class="text-white/35">—</span>
        </template>

        <template #status-cell="{ row }">
          <UBadge :color="statusColor(row.original.status)" variant="subtle">
            {{ row.original.status }}
          </UBadge>
        </template>

        <template #createdAt-cell="{ row }">
          <span class="text-white/55">{{ formatDate(row.original.createdAt) }}</span>
        </template>

        <template #actions-cell="{ row }">
          <ThakhinRowMenu :items="getActionItems(row.original)" />
        </template>
      </UTable>
    </ThakhinTableFrame>

    <USlideover v-model:open="paymentOpen" title="Payment" :ui="{ content: 'bg-[#171717]' }">
      <template #body>
        <div v-if="selectedPayment" class="space-y-3 text-sm text-white/80">
          <p class="text-white">{{ selectedPayment.payerName }} · {{ selectedPayment.payerEmail }}</p>
          <p>{{ formatMoney(selectedPayment.totalAmountMinor, selectedPayment.currency) }}</p>
          <p>Status: {{ selectedPayment.status }}</p>
          <p v-if="selectedPayment.note">{{ selectedPayment.note }}</p>
          <NuxtLink
            v-if="selectedPayment.linkedRequestId"
            :to="ROUTES.THAKHIN.REQUESTS"
            class="text-[#d6b25e]"
          >
            Linked request {{ selectedPayment.linkedRequestId }}
          </NuxtLink>
          <div v-for="item in selectedPayment.items" :key="item.cardId" class="border-t border-[#2a2a2a] pt-2">
            <p>{{ item.planCode }} · {{ formatMoney(item.amountMinor, item.currency) }}</p>
            <p>{{ new Date(item.startAt).toLocaleDateString() }} – {{ new Date(item.endAt).toLocaleDateString() }}</p>
          </div>
        </div>
      </template>
    </USlideover>
  </div>
</template>
