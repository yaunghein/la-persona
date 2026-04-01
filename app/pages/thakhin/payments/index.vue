<script setup lang="ts">
definePageMeta({
  layout: 'thakhin',
});

import type { DropdownMenuItem, TableColumn } from '@nuxt/ui';

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

const globalQuery = ref('');
const filterPayer = ref('');
const filterStatus = ref<'all' | 'submitted' | 'approved' | 'rejected'>('all');
const filterLink = ref<'all' | 'linked' | 'standalone'>('all');

const page = ref(1);
const itemsPerPage = 10;

function getS3Url(path?: string | null) {
  if (!path) return '';
  if (path.startsWith('http')) return path;

  const bucket = runtimeConfig.public.awsBucketName;
  const region = runtimeConfig.public.awsRegion;
  const normalizedPath = path.replace(/^\/+/, '');
  return `https://${bucket}.s3.${region}.amazonaws.com/${normalizedPath}`;
}

const filteredRows = computed(() => {
  const q = globalQuery.value.trim().toLowerCase();

  return rows.value.filter((row) => {
    const payerName = (row.payerName || '').toLowerCase();
    const payerEmail = (row.payerEmail || '').toLowerCase();
    const status = (row.status || '').toLowerCase();
    const note = (row.note || '').toLowerCase();

    const matchesGlobal =
      !q ||
      row.id.toLowerCase().includes(q) ||
      payerName.includes(q) ||
      payerEmail.includes(q) ||
      status.includes(q) ||
      note.includes(q);

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

    return matchesGlobal && matchesPayer && matchesStatus && matchesLink;
  });
});

const total = computed(() => filteredRows.value.length);
const maxPage = computed(() =>
  Math.max(1, Math.ceil(total.value / itemsPerPage))
);

const pagedRows = computed(() => {
  const start = (page.value - 1) * itemsPerPage;
  return filteredRows.value.slice(start, start + itemsPerPage);
});

watch([filteredRows, maxPage], () => {
  if (page.value > maxPage.value) {
    page.value = maxPage.value;
  }
});

function typeLabel(type: CardRequestRow['type']) {
  return type === 'existing_design' ? 'Existing Design' : 'New Design';
}

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

function cannotApproveLinkedRequest() {
  toast.add({
    title: 'Approve from Requests',
    description: 'This payment is linked to a card request approval flow.',
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
            ? cannotApproveLinkedRequest()
            : approvePayment(row),
      },
    ],
  ];
}

const columns: TableColumn<PaymentRow>[] = [
  { accessorKey: 'id', header: 'PAYMENT ID' },
  { accessorKey: 'payerName', header: 'PAYER' },
  { accessorKey: 'payerEmail', header: 'EMAIL' },
  { accessorKey: 'itemCount', header: 'ITEMS' },
  { accessorKey: 'totalAmountMinor', header: 'AMOUNT' },
  { accessorKey: 'receiptUrl', header: 'RECEIPT' },
  { accessorKey: 'linkedRequestId', header: 'LINKED REQUEST' },
  { accessorKey: 'status', header: 'STATUS' },
  { accessorKey: 'createdAt', header: 'CREATED AT' },
  { id: 'actions', header: '' },
];
</script>

<template>
  <div class="flex min-h-[calc(100dvh-11rem)] flex-col gap-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1
        class="text-[1.75rem] font-normal leading-tight tracking-widest uppercase"
      >
        Subscription Payments
      </h1>
      <UButton
        size="xl"
        label="Refresh"
        icon="i-lucide-refresh-cw"
        color="neutral"
        variant="outline"
        class="rounded-full"
        :loading="pending"
        @click="refresh()"
      />
    </div>

    <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
      <UInput
        v-model="globalQuery"
        placeholder="Global search..."
        icon="i-lucide-search"
      />
      <UInput v-model="filterPayer" placeholder="Filter payer..." />
      <USelect
        v-model="filterStatus"
        :items="[
          { label: 'All Status', value: 'all' },
          { label: 'Submitted', value: 'submitted' },
          { label: 'Approved', value: 'approved' },
          { label: 'Rejected', value: 'rejected' },
        ]"
      />
      <USelect
        v-model="filterLink"
        :items="[
          { label: 'All Payment Types', value: 'all' },
          { label: 'Linked to Request', value: 'linked' },
          { label: 'Standalone Payment', value: 'standalone' },
        ]"
      />
      <div />
    </div>

    <div class="hide-scrollbar flex-1 overflow-x-auto overflow-y-hidden">
      <UTable
        :data="pagedRows"
        :columns="columns"
        :ui="{
          th: 'px-4 py-4 border-b border-[#232323] text-xs font-semibold tracking-wide uppercase text-white',
          td: 'px-4 py-4 border-b border-[#232323] text-sm text-[#8b8b8b]',
          tr: 'bg-transparent',
          empty: 'py-16 text-center text-sm text-muted',
        }"
        class="w-full min-w-[1100px]"
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
