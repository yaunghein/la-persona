<script setup lang="ts">
definePageMeta({
  layout: 'thakhin',
});

import type { DropdownMenuItem, TableColumn } from '@nuxt/ui';

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

const { data, pending, refresh } = await useFetch<CardRequestRow[]>(
  '/api/card-requests'
);

const rows = ref<CardRequestRow[]>([]);

watch(
  data,
  (value) => {
    rows.value = value || [];
  },
  { immediate: true }
);

const globalQuery = ref('');
const filterName = ref('');
const filterEmail = ref('');
const filterType = ref<'all' | 'new_design' | 'existing_design'>('all');
const filterStatus = ref<'all' | 'pending' | 'approved' | 'declined'>('all');

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
    const cardName = row.cardData?.name?.toLowerCase() || '';
    const requesterName = (row.requesterName || '').toLowerCase();
    const requesterEmail = (row.requesterEmail || '').toLowerCase();
    const status = (row.status || '').toLowerCase();
    const type = (row.type || '').toLowerCase();

    const matchesGlobal =
      !q ||
      row.id.toLowerCase().includes(q) ||
      cardName.includes(q) ||
      requesterName.includes(q) ||
      requesterEmail.includes(q) ||
      status.includes(q) ||
      type.includes(q);

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

    return (
      matchesGlobal &&
      matchesName &&
      matchesEmail &&
      matchesType &&
      matchesStatus
    );
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

function statusColor(status: string) {
  if (status === 'approved') return 'success';
  if (status === 'declined') return 'error';
  return 'warning';
}

async function approveRequest(row: CardRequestRow) {
  try {
    await $fetch(`/api/card-requests/${row.id}/approve`, { method: 'POST' });
    await refresh();
    toast.add({
      title: 'Request approved',
      description: `${row.cardData?.name || 'Request'} is now approved.`,
      color: 'success',
    });
  } catch (error: any) {
    toast.add({
      title: 'Approve failed',
      description: error?.data?.statusMessage || error?.message || 'Please try again.',
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
  { accessorKey: 'id', header: 'REQUEST ID' },
  { accessorKey: 'requesterName', header: 'REQUESTER' },
  { accessorKey: 'requesterEmail', header: 'EMAIL' },
  { accessorKey: 'type', header: 'TYPE' },
  { accessorKey: 'cardData.name', id: 'cardName', header: 'CARD NAME' },
  { accessorKey: 'paymentReceiptUrl', header: 'RECEIPT' },
  { accessorKey: 'status', header: 'STATUS' },
  { accessorKey: 'createdAt', header: 'CREATED AT' },
  { id: 'actions', header: '' },
];
</script>

<template>
  <div class="flex min-h-[calc(100dvh-11rem)] flex-col gap-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-[1.75rem] font-normal leading-tight tracking-widest uppercase">
        Card Requests
      </h1>
      <UButton
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
      <UInput v-model="filterName" placeholder="Filter requester..." />
      <UInput v-model="filterEmail" placeholder="Filter email..." />
      <USelect
        v-model="filterType"
        :items="[
          { label: 'All Types', value: 'all' },
          { label: 'New Design', value: 'new_design' },
          { label: 'Existing Design', value: 'existing_design' },
        ]"
      />
      <USelect
        v-model="filterStatus"
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
