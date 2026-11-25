<script setup lang="ts">
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui';
import type {
  CardRequestForReview,
  CardUpdateRequestForReview,
} from '~~/shared/contracts/card';
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
  ADMIN_TABS_UI,
} from '~/features/admin/utils/admin-ui';

definePageMeta({
  layout: 'thakhin',
});

type CardRequestRow = CardRequestForReview;
type UpdateRow = CardUpdateRequestForReview;

const toast = useToast();

const { data, isLoading: pending } = useCardRequestsQuery();
const rows = computed(() => data.value?.items ?? []);
const { mutateAsync: reviewCardRequest } = useReviewCardRequestMutation();
const { mutateAsync: reviewCardUpdateRequest } = useReviewCardRequestMutation(
  'card-update-requests'
);

const filterName = useQueryState('name', '');
const filterEmail = useQueryState('email', '');
const filterType = useQueryState<'all' | 'new_design' | 'existing_design'>(
  'type',
  'all'
);
const filterStatus = useQueryState<'all' | 'pending' | 'approved' | 'declined'>(
  'status',
  'pending'
);
const tab = useQueryState<'design' | 'updates'>('tab', 'design');
const selectedRequest = ref<CardRequestRow | null>(null);
const requestOpen = ref(false);

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
} = useAdminTable(() => filteredRows.value.length);

watch([filterName, filterEmail, filterType, filterStatus], resetPage);

function showTab(value: 'design' | 'updates') {
  tab.value = value;
}

function typeLabel(type: CardRequestRow['type']) {
  return type === 'existing_design' ? 'Existing Design' : 'New Design';
}

const { data: updateData, isLoading: updatesLoading } =
  useCardUpdateRequestsQuery();
const updateRows = computed(() =>
  (updateData.value?.items ?? []).filter((row) =>
    updateStatus.value === 'all' ? true : row.status === updateStatus.value
  )
);
const updateStatus = useQueryState<'all' | 'pending' | 'approved' | 'declined'>(
  'updates_status',
  'pending'
);
const selectedUpdate = ref<UpdateRow | null>(null);
const updateOpen = ref(false);

const {
  globalFilter: updateFilter,
  sorting: updateSorting,
  pagination: updatePagination,
  paginationOptions: updatePaginationOptions,
  paginationTotal: updatePaginationTotal,
  onPageChange: onUpdatePageChange,
} = useAdminTable(() => updateRows.value.length, {
  searchQueryKey: 'updates_q',
  tableRef: 'updateTable',
});

async function decideUpdate(row: UpdateRow, decision: 'approve' | 'decline') {
  try {
    await reviewCardUpdateRequest({
      requestId: row.id,
      status: decision === 'approve' ? 'approved' : 'declined',
    });
    toast.add({
      title: decision === 'approve' ? 'Update applied' : 'Update declined',
      color: 'success',
    });
  } catch (error: any) {
    toast.add({
      title: 'Update failed',
      description: error?.data?.statusMessage || 'Please try again.',
      color: 'error',
    });
  }
}

const updateColumns: TableColumn<UpdateRow>[] = [
  { accessorKey: 'requesterEmail', header: sortableHeader('EMAIL') },
  {
    id: 'cardSlug',
    accessorFn: (row) => row.card.slug,
    header: sortableHeader('CARD'),
  },
  { accessorKey: 'status', header: sortableHeader('STATUS') },
  { accessorKey: 'note', header: sortableHeader('NOTE') },
  { accessorKey: 'createdAt', header: sortableHeader('CREATED') },
  ADMIN_ACTIONS_COLUMN,
];

function updateActions(row: UpdateRow): DropdownMenuItem[][] {
  if (row.status !== 'pending') {
    return [[{ label: 'No actions available', disabled: true }]];
  }
  return [
    [
      {
        label: 'Approve',
        icon: 'i-lucide-check',
        onSelect: () => decideUpdate(row, 'approve'),
      },
      {
        label: 'Decline',
        icon: 'i-lucide-x',
        color: 'error',
        onSelect: () => decideUpdate(row, 'decline'),
      },
    ],
  ];
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

async function approveRequest(row: CardRequestRow) {
  try {
    await reviewCardRequest({ requestId: row.id, status: 'approved' });
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

async function declineRequest(row: CardRequestRow) {
  try {
    await reviewCardRequest({ requestId: row.id, status: 'declined' });
    toast.add({
      title: 'Request declined',
      description: 'Linked submitted payments were rejected.',
      color: 'success',
    });
  } catch (error: any) {
    toast.add({
      title: 'Decline failed',
      description: error?.data?.statusMessage || 'Please try again.',
      color: 'error',
    });
  }
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
        onSelect: () => declineRequest(row),
      },
    ],
  ];
}

const columns: TableColumn<CardRequestRow>[] = [
  { accessorKey: 'id', header: sortableHeader('REQUEST ID') },
  {
    accessorKey: 'requesterName',
    header: sortableHeader('REQUESTER'),
  },
  { accessorKey: 'requesterEmail', header: sortableHeader('EMAIL') },
  { accessorKey: 'type', header: sortableHeader('TYPE') },
  {
    accessorKey: 'cardData.name',
    id: 'cardName',
    header: sortableHeader('CARD NAME'),
    accessorFn: (row) => row.cardData?.name || '',
  },
  {
    accessorKey: 'paymentReceiptUrl',
    header: 'Receipt',
    enableSorting: false,
    enableGlobalFilter: false,
  },
  { accessorKey: 'status', header: sortableHeader('STATUS') },
  { accessorKey: 'createdAt', header: sortableHeader('CREATED AT') },
  ADMIN_ACTIONS_COLUMN,
];
</script>

<template>
  <div :class="ADMIN_PAGE_CLASS">
    <AdminPageHeader
      title="Requests"
      description-class="max-w-96"
      description="Approve or decline design requests and card update requests. Declining a design also rejects its&nbsp;payment."
    />

    <UTabs
      v-model="tab"
      :items="[
        { label: 'Design', value: 'design' },
        { label: 'Updates', value: 'updates' },
      ]"
      :content="false"
      color="neutral"
      variant="pill"
      :ui="ADMIN_TABS_UI"
    />

    <template v-if="tab === 'design'">
      <AdminTableFrame
        :page="pagination.pageIndex + 1"
        :total="paginationTotal"
        :items-per-page="pagination.pageSize"
        :loading="pending"
        @update:page="onPageChange"
      >
        <template #toolbar>
          <UInput
            v-model="globalFilter"
            placeholder="Search requests"
            icon="i-lucide-search"
            color="neutral"
            variant="soft"
            class="w-full sm:w-56"
            :ui="ADMIN_SEARCH_UI"
          />
          <UInput
            v-model="filterName"
            placeholder="Requester"
            color="neutral"
            variant="soft"
            class="w-full sm:w-40"
            :ui="ADMIN_SEARCH_UI"
          />
          <UInput
            v-model="filterEmail"
            placeholder="Email"
            color="neutral"
            variant="soft"
            class="w-full sm:w-44"
            :ui="ADMIN_SEARCH_UI"
          />
          <USelect
            v-model="filterType"
            class="w-full sm:w-44"
            :ui="ADMIN_FILTER_UI"
            :items="[
              { label: 'All types', value: 'all' },
              { label: 'New design', value: 'new_design' },
              { label: 'Existing design', value: 'existing_design' },
            ]"
          />
          <USelect
            v-model="filterStatus"
            class="w-full sm:w-40"
            :ui="ADMIN_FILTER_UI"
            :items="[
              { label: 'Pending', value: 'pending' },
              { label: 'Approved', value: 'approved' },
              { label: 'Declined', value: 'declined' },
              { label: 'All statuses', value: 'all' },
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
          class="w-full min-w-4xl"
          @select="
            (_event, row) => {
              selectedRequest = row.original;
              requestOpen = true;
            }
          "
        >
          <template #id-cell="{ row }">
            <span class="font-mono text-xs text-muted">{{
              row.original.id
            }}</span>
          </template>
          <template #requesterName-cell="{ row }">
            <span class="font-medium text-ink">
              {{ row.original.requesterName || '—' }}
            </span>
          </template>
          <template #type-cell="{ row }">
            <AdminStatusPill
              :label="typeLabel(row.original.type)"
              :tone="row.original.type === 'new_design' ? 'gold' : 'ink'"
            />
          </template>
          <template #cardName-cell="{ row }">
            {{ row.original.cardData?.name || '—' }}
          </template>
          <template #paymentReceiptUrl-cell="{ row }">
            <UButton
              v-if="row.original.paymentReceiptUrl"
              label="Receipt"
              leading-icon="i-lucide-external-link"
              color="neutral"
              variant="ghost"
              class="h-9 cursor-pointer rounded-full px-3.5 text-sm font-medium text-ink hover:bg-ink/15"
              :ui="{ leadingIcon: 'size-4' }"
              :to="resolveObjectStorageUrl(row.original.paymentReceiptUrl)"
              target="_blank"
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
    </template>

    <AdminTableFrame
      v-else
      :page="updatePagination.pageIndex + 1"
      :total="updatePaginationTotal"
      :items-per-page="updatePagination.pageSize"
      :loading="updatesLoading"
      @update:page="onUpdatePageChange"
    >
      <template #toolbar>
        <USelect
          v-model="updateStatus"
          class="w-full sm:w-40"
          :ui="ADMIN_FILTER_UI"
          :items="[
            { label: 'Pending', value: 'pending' },
            { label: 'Approved', value: 'approved' },
            { label: 'Declined', value: 'declined' },
            { label: 'All statuses', value: 'all' },
          ]"
        />
      </template>
      <UTable
        ref="updateTable"
        v-model:global-filter="updateFilter"
        v-model:sorting="updateSorting"
        v-model:pagination="updatePagination"
        :data="updateRows"
        :columns="updateColumns"
        :loading="updatesLoading"
        :pagination-options="updatePaginationOptions"
        :ui="ADMIN_TABLE_UI"
        class="w-full"
        @select="
          (_event, row) => {
            selectedUpdate = row.original;
            updateOpen = true;
          }
        "
      >
        <template #requesterEmail-cell="{ row }">
          <span class="font-medium text-ink">{{
            row.original.requesterEmail
          }}</span>
        </template>
        <template #cardSlug-cell="{ row }">
          <span class="font-mono text-xs text-muted">{{
            row.original.card.slug
          }}</span>
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
          <AdminRowMenu :items="updateActions(row.original)" />
        </template>
      </UTable>
    </AdminTableFrame>

    <USlideover
      v-model:open="requestOpen"
      title="Design request"
      side="right"
      inset
      :ui="ADMIN_SLIDEOVER_UI"
    >
      <template #body>
        <div v-if="selectedRequest" class="space-y-2 text-sm text-soft">
          <p class="text-ink">
            {{ selectedRequest.cardData?.name || 'Untitled' }}
          </p>
          <p>
            {{ selectedRequest.requesterName }} •
            {{ selectedRequest.requesterEmail }}
          </p>
          <p>
            {{ selectedRequest.cardData?.position }} •
            {{ selectedRequest.cardData?.company }}
          </p>
          <p>
            {{ selectedRequest.cardData?.phone }} •
            {{ selectedRequest.cardData?.email }}
          </p>
          <p>{{ selectedRequest.cardData?.website }}</p>
          <p>
            Payment {{ selectedRequest.paymentId || 'none' }} •
            {{ selectedRequest.paymentStatus || 'n/a' }}
          </p>
        </div>
      </template>

      <template #footer>
        <UButton
          v-if="selectedRequest?.paymentReceiptUrl"
          label="View receipt"
          leading-icon="i-lucide-external-link"
          color="neutral"
          :to="resolveObjectStorageUrl(selectedRequest.paymentReceiptUrl)"
          target="_blank"
          :class="ADMIN_SLIDEOVER_BUTTON_CLASS"
        />
      </template>
    </USlideover>

    <USlideover
      v-model:open="updateOpen"
      title="Card update"
      side="right"
      inset
      :ui="ADMIN_SLIDEOVER_UI"
    >
      <template #body>
        <div v-if="selectedUpdate" class="space-y-2 text-sm text-soft">
          <p class="text-ink">
            {{ selectedUpdate.card.firstName }}
            {{ selectedUpdate.card.lastName }}
          </p>
          <p>Requested by {{ selectedUpdate.requesterEmail }}</p>
          <p>
            Name: {{ selectedUpdate.card.firstName }}
            {{ selectedUpdate.card.lastName }} →
            {{ selectedUpdate.requested.firstName }}
            {{ selectedUpdate.requested.lastName }}
          </p>
          <p>
            Position: {{ selectedUpdate.card.position }} →
            {{ selectedUpdate.requested.position }}
          </p>
          <p>
            Phone: {{ selectedUpdate.card.phone }} →
            {{ selectedUpdate.requested.phone }}
          </p>
          <p>
            Email: {{ selectedUpdate.card.email }} →
            {{ selectedUpdate.requested.email }}
          </p>
          <p>
            Website: {{ selectedUpdate.card.website }} →
            {{ selectedUpdate.requested.website }}
          </p>
          <p v-if="selectedUpdate.note">Note: {{ selectedUpdate.note }}</p>
        </div>
      </template>
    </USlideover>
  </div>
</template>
