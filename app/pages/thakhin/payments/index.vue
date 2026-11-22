<script setup lang="ts">
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui';
import type { PaymentForReview } from '~~/shared/contracts/billing';
import { useQueryClient } from '@tanstack/vue-query';
import { billingQueryKeys } from '~/features/billing/composables/use-billing-queries';
import {
  ADMIN_ACTIONS_COLUMN,
  ADMIN_TABLE_UI,
  sortableHeader,
} from '~/features/admin/utils/admin-table';
import {
  ADMIN_FILTER_UI,
  ADMIN_PAGE_CLASS,
  ADMIN_SEARCH_UI,
  ADMIN_SLIDEOVER_BUTTON_CLASS,
  ADMIN_SLIDEOVER_UI,
} from '~/features/admin/utils/admin-ui';

definePageMeta({
  layout: 'thakhin',
});

type PaymentRow = PaymentForReview;

const toast = useToast();
const queryClient = useQueryClient();
const { data, isLoading: pending } = usePaymentReviewQueueQuery();
const rows = computed(() => data.value?.items ?? []);
const { mutateAsync: reviewPayment } = useReviewPaymentMutation();

const filterPayer = useQueryState('payer', '');
const filterStatus = useQueryState<
  'all' | 'submitted' | 'approved' | 'rejected'
>('status', 'submitted');
const filterLink = useQueryState<'all' | 'linked' | 'standalone'>(
  'link',
  'all'
);
const selectedPayment = ref<PaymentRow | null>(null);
const paymentOpen = ref(false);
const amountDrafts = ref<Record<string, number>>({});
const savingItemId = ref<string | null>(null);

function openPayment(row: PaymentRow) {
  selectedPayment.value = row;
  amountDrafts.value = Object.fromEntries(
    row.items.map((item) => [item.id, item.amountMinor])
  );
  paymentOpen.value = true;
}

async function saveAmount(itemId: string) {
  savingItemId.value = itemId;
  try {
    await adminApi.updatePaymentItem(itemId, {
      amountMinor: amountDrafts.value[itemId] ?? 0,
    });
    await queryClient.invalidateQueries({ queryKey: billingQueryKeys.all });
    toast.add({ title: 'Amount updated', color: 'success' });
  } catch (error: any) {
    toast.add({
      title: 'Could not update the amount',
      description:
        error?.data?.statusMessage ||
        error?.statusMessage ||
        'Please try again.',
      color: 'error',
    });
  } finally {
    savingItemId.value = null;
  }
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
} = useAdminTable(() => filteredRows.value.length);

watch([filterPayer, filterStatus, filterLink], resetPage);

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function formatMoney(amountMinor: number, currency?: string | null) {
  const suffix = currency || 'MMK';
  return `${amountMinor.toLocaleString()} ${suffix}`;
}

async function approvePayment(row: PaymentRow) {
  try {
    await reviewPayment({
      paymentId: row.id,
      decision: { status: 'approved' },
    });
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
    await reviewPayment({
      paymentId: row.id,
      decision: { status: 'rejected' },
    });
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
    label: 'Review',
    icon: 'i-lucide-pencil',
    onSelect: () => openPayment(row),
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
  { accessorKey: 'id', header: sortableHeader('PAYMENT ID') },
  { accessorKey: 'payerName', header: sortableHeader('PAYER') },
  { accessorKey: 'payerEmail', header: sortableHeader('EMAIL') },
  { accessorKey: 'itemCount', header: sortableHeader('ITEMS') },
  {
    accessorKey: 'totalAmountMinor',
    header: sortableHeader('AMOUNT'),
  },
  {
    accessorKey: 'receiptUrl',
    header: 'Receipt',
    enableSorting: false,
    enableGlobalFilter: false,
  },
  {
    accessorKey: 'linkedRequestId',
    header: sortableHeader('LINKED REQUEST'),
  },
  {
    accessorKey: 'linkedRequestStatus',
    header: sortableHeader('REQUEST STATUS'),
  },
  { accessorKey: 'status', header: sortableHeader('STATUS') },
  { accessorKey: 'createdAt', header: sortableHeader('CREATED AT') },
  ADMIN_ACTIONS_COLUMN,
];
</script>

<template>
  <div :class="ADMIN_PAGE_CLASS">
    <AdminPageHeader
      title="Payments"
      description-class="max-w-104"
      description="Approve or reject payments that were submitted without a request. Request payments are decided on&nbsp;Requests."
    />

    <AdminTableFrame
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
          color="neutral"
          variant="soft"
          class="w-full sm:w-64"
          :ui="ADMIN_SEARCH_UI"
        />
        <UInput
          v-model="filterPayer"
          placeholder="Payer"
          color="neutral"
          variant="soft"
          class="w-full sm:w-44"
          :ui="ADMIN_SEARCH_UI"
        />
        <USelect
          v-model="filterStatus"
          class="w-full sm:w-40"
          :ui="ADMIN_FILTER_UI"
          :items="[
            { label: 'Submitted', value: 'submitted' },
            { label: 'Approved', value: 'approved' },
            { label: 'Rejected', value: 'rejected' },
            { label: 'All statuses', value: 'all' },
          ]"
        />
        <USelect
          v-model="filterLink"
          class="w-full sm:w-44"
          :ui="ADMIN_FILTER_UI"
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
        :ui="ADMIN_TABLE_UI"
        class="w-full min-w-[48rem]"
        @select="(_event, row) => openPayment(row.original)"
      >
        <template #id-cell="{ row }">
          <span class="font-mono text-xs text-muted">{{
            row.original.id
          }}</span>
        </template>

        <template #payerName-cell="{ row }">
          <span class="font-medium text-ink">
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
            v-if="row.original.receiptUrl"
            label="Receipt"
            leading-icon="i-lucide-external-link"
            color="neutral"
            variant="ghost"
            class="h-9 cursor-pointer rounded-full px-3.5 text-sm font-medium text-ink hover:bg-ink/15"
            :ui="{ leadingIcon: 'size-4' }"
            :to="resolveObjectStorageUrl(row.original.receiptUrl)"
            target="_blank"
          />
          <span v-else class="text-muted">—</span>
        </template>

        <template #linkedRequestId-cell="{ row }">
          <span
            v-if="row.original.linkedRequestId"
            class="font-mono text-xs text-muted"
          >
            {{ row.original.linkedRequestId }}
          </span>
          <span v-else class="text-subtle">—</span>
        </template>

        <template #linkedRequestStatus-cell="{ row }">
          <AdminStatusPill
            v-if="row.original.linkedRequestStatus"
            v-bind="reviewStatusPill(row.original.linkedRequestStatus)"
          />
          <span v-else class="text-subtle">—</span>
        </template>

        <template #status-cell="{ row }">
          <AdminStatusPill v-bind="reviewStatusPill(row.original.status)" />
        </template>

        <template #createdAt-cell="{ row }">
          <span class="text-muted">{{
            formatDate(row.original.createdAt)
          }}</span>
        </template>

        <template #actions-cell="{ row }">
          <AdminRowMenu :items="getActionItems(row.original)" />
        </template>
      </UTable>
    </AdminTableFrame>

    <USlideover
      v-model:open="paymentOpen"
      title="Payment"
      side="right"
      inset
      :ui="ADMIN_SLIDEOVER_UI"
    >
      <template #body>
        <div v-if="selectedPayment" class="flex flex-col gap-6 py-2">
          <div class="space-y-1 text-sm">
            <p class="font-medium text-ink">
              {{ selectedPayment.payerName }} · {{ selectedPayment.payerEmail }}
            </p>
            <p class="text-muted">
              {{
                formatMoney(
                  selectedPayment.totalAmountMinor,
                  selectedPayment.currency
                )
              }}
              · {{ selectedPayment.status }}
            </p>
            <p v-if="selectedPayment.note" class="text-muted">
              {{ selectedPayment.note }}
            </p>
            <NuxtLink
              v-if="selectedPayment.linkedRequestId"
              :to="ROUTES.THAKHIN.REQUESTS"
              class="text-sm font-medium text-ink underline-offset-4 hover:underline"
            >
              Linked request
            </NuxtLink>
          </div>
          <form
            v-for="item in selectedPayment.items"
            :key="item.id"
            class="space-y-3 border-t-2 border-raised pt-6"
            @submit.prevent="saveAmount(item.id)"
          >
            <p class="text-sm font-medium text-ink">
              {{ item.planCode }} ·
              {{ new Date(item.startAt).toLocaleDateString() }} –
              {{ new Date(item.endAt).toLocaleDateString() }}
            </p>
            <UFormField
              label="Amount"
              class="[&_label]:mb-3 [&_label]:text-sm [&_label]:font-medium [&_label]:text-ink"
            >
              <UInput
                v-model.number="amountDrafts[item.id]"
                type="number"
                min="0"
                class="w-full"
                size="xl"
                :ui="{
                  base: 'h-[47px] rounded-[4px] border-line bg-raised text-sm text-ink',
                }"
              />
            </UFormField>
            <UButton
              label="Save amount"
              type="submit"
              color="neutral"
              :loading="savingItemId === item.id"
              :class="ADMIN_SLIDEOVER_BUTTON_CLASS"
            />
          </form>
        </div>
      </template>
    </USlideover>
  </div>
</template>
