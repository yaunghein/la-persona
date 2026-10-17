<script setup lang="ts">
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui';
import type {
  CardRequestForReview,
  CardUpdateRequestForReview,
} from '~~/shared/contracts/card';
import {
  THAKHIN_ACTIONS_COLUMN,
  THAKHIN_TABLE_UI,
  thakhinSortableHeader,
} from '~/utils/thakhin-table';

definePageMeta({
  layout: 'thakhin',
});

type CardRequestRow = CardRequestForReview;
type UpdateRow = CardUpdateRequestForReview;

const toast = useToast();
const route = useRoute();

const { data, isLoading: pending } = useCardRequestsQuery();
const rows = computed(() => data.value?.items ?? []);
const { mutateAsync: reviewCardRequest } = useReviewCardRequestMutation();
const { mutateAsync: reviewCardUpdateRequest } =
  useReviewCardRequestMutation('card-update-requests');

const filterName = ref('');
const filterEmail = ref('');
const filterType = ref<'all' | 'new_design' | 'existing_design'>('all');
const filterStatus = ref<'all' | 'pending' | 'approved' | 'declined'>('pending');
const tab = ref<'design' | 'updates'>(
  route.query.tab === 'updates' ? 'updates' : 'design'
);
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
} = useThakhinTable(() => filteredRows.value.length);

watch([filterName, filterEmail, filterType, filterStatus], resetPage);

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
const updateStatus = ref<'all' | 'pending' | 'approved' | 'declined'>('pending');
const selectedUpdate = ref<UpdateRow | null>(null);
const updateOpen = ref(false);

const {
  globalFilter: updateFilter,
  sorting: updateSorting,
  pagination: updatePagination,
  paginationOptions: updatePaginationOptions,
  paginationTotal: updatePaginationTotal,
  onPageChange: onUpdatePageChange,
} = useThakhinTable(() => updateRows.value.length);

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
  { accessorKey: 'requesterEmail', header: thakhinSortableHeader('EMAIL') },
  {
    id: 'cardSlug',
    accessorFn: (row) => row.card.slug,
    header: thakhinSortableHeader('CARD'),
  },
  { accessorKey: 'status', header: thakhinSortableHeader('STATUS') },
  { accessorKey: 'note', header: thakhinSortableHeader('NOTE') },
  { accessorKey: 'createdAt', header: thakhinSortableHeader('CREATED') },
  THAKHIN_ACTIONS_COLUMN,
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

function statusColor(status: string) {
  if (status === 'approved') return 'success';
  if (status === 'declined') return 'error';
  return 'warning';
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
    header: 'Receipt',
    enableSorting: false,
    enableGlobalFilter: false,
  },
  { accessorKey: 'status', header: thakhinSortableHeader('STATUS') },
  { accessorKey: 'createdAt', header: thakhinSortableHeader('CREATED AT') },
  THAKHIN_ACTIONS_COLUMN,
];
</script>

<template>
  <div class="flex flex-col gap-6">
    <ThakhinPageHeader
      title="Requests"
      description="Approve or decline design requests and card updates. Declining a design request also rejects its submitted payment."
    />

    <div class="flex gap-2">
      <UButton
        label="Design"
        size="sm"
        :color="tab === 'design' ? 'primary' : 'neutral'"
        :variant="tab === 'design' ? 'solid' : 'ghost'"
        @click="tab = 'design'"
      />
      <UButton
        label="Updates"
        size="sm"
        :color="tab === 'updates' ? 'primary' : 'neutral'"
        :variant="tab === 'updates' ? 'solid' : 'ghost'"
        @click="tab = 'updates'"
      />
    </div>

    <template v-if="tab === 'design'">
      <ThakhinTableFrame
        :page="pagination.pageIndex + 1"
        :total="paginationTotal"
        :items-per-page="pagination.pageSize"
        @update:page="onPageChange"
      >
        <template #toolbar>
          <UInput
            v-model="globalFilter"
            placeholder="Search requests"
            icon="i-lucide-search"
            size="sm"
            class="w-52"
          />
          <UInput
            v-model="filterName"
            placeholder="Requester"
            size="sm"
            class="w-40"
          />
          <UInput
            v-model="filterEmail"
            placeholder="Email"
            size="sm"
            class="w-44"
          />
          <USelect
            v-model="filterType"
            size="sm"
            class="w-40"
            :items="[
              { label: 'All types', value: 'all' },
              { label: 'New design', value: 'new_design' },
              { label: 'Existing design', value: 'existing_design' },
            ]"
          />
          <USelect
            v-model="filterStatus"
            size="sm"
            class="w-36"
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
          :ui="THAKHIN_TABLE_UI"
          class="w-full min-w-[48rem]"
          @select="(_event, row) => { selectedRequest = row.original; requestOpen = true }"
        >
          <template #requesterName-cell="{ row }">
            <span class="font-medium text-white">
              {{ row.original.requesterName || '—' }}
            </span>
          </template>
          <template #type-cell="{ row }">
            {{ typeLabel(row.original.type) }}
          </template>
          <template #cardName-cell="{ row }">
            {{ row.original.cardData?.name || '—' }}
          </template>
          <template #paymentReceiptUrl-cell="{ row }">
            <UButton
              v-if="row.original.paymentReceiptUrl"
              size="sm"
              label="Receipt"
              icon="i-lucide-external-link"
              color="neutral"
              variant="link"
              class="px-0"
              :to="resolveObjectStorageUrl(row.original.paymentReceiptUrl)"
              target="_blank"
            />
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
    </template>

    <ThakhinTableFrame
      v-else
      :page="updatePagination.pageIndex + 1"
      :total="updatePaginationTotal"
      :items-per-page="updatePagination.pageSize"
      @update:page="onUpdatePageChange"
    >
      <template #toolbar>
        <USelect
          v-model="updateStatus"
          class="w-40"
          size="sm"
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
        :ui="THAKHIN_TABLE_UI"
        class="w-full"
        @select="(_event, row) => { selectedUpdate = row.original; updateOpen = true }"
      >
        <template #createdAt-cell="{ row }">
          <span class="text-white/55">{{ formatDate(row.original.createdAt) }}</span>
        </template>
        <template #actions-cell="{ row }">
          <ThakhinRowMenu :items="updateActions(row.original)" />
        </template>
      </UTable>
    </ThakhinTableFrame>

    <USlideover v-model:open="requestOpen" title="Design request" :ui="{ content: 'bg-[#171717]' }">
      <template #body>
        <div v-if="selectedRequest" class="space-y-2 text-sm text-white/80">
          <p class="text-white">{{ selectedRequest.cardData?.name || 'Untitled' }}</p>
          <p>{{ selectedRequest.requesterName }} · {{ selectedRequest.requesterEmail }}</p>
          <p>{{ selectedRequest.cardData?.position }} · {{ selectedRequest.cardData?.company }}</p>
          <p>{{ selectedRequest.cardData?.phone }} · {{ selectedRequest.cardData?.email }}</p>
          <p>{{ selectedRequest.cardData?.website }}</p>
          <p>Payment {{ selectedRequest.paymentId || 'none' }} · {{ selectedRequest.paymentStatus || 'n/a' }}</p>
          <UButton
            v-if="selectedRequest.paymentReceiptUrl"
            label="View receipt"
            variant="link"
            :to="resolveObjectStorageUrl(selectedRequest.paymentReceiptUrl)"
            target="_blank"
          />
        </div>
      </template>
    </USlideover>

    <USlideover v-model:open="updateOpen" title="Card update" :ui="{ content: 'bg-[#171717]' }">
      <template #body>
        <div v-if="selectedUpdate" class="space-y-2 text-sm text-white/80">
          <p class="text-white">{{ selectedUpdate.card.firstName }} {{ selectedUpdate.card.lastName }}</p>
          <p>Requested by {{ selectedUpdate.requesterEmail }}</p>
          <p>Name: {{ selectedUpdate.card.firstName }} {{ selectedUpdate.card.lastName }} → {{ selectedUpdate.requested.firstName }} {{ selectedUpdate.requested.lastName }}</p>
          <p>Position: {{ selectedUpdate.card.position }} → {{ selectedUpdate.requested.position }}</p>
          <p>Phone: {{ selectedUpdate.card.phone }} → {{ selectedUpdate.requested.phone }}</p>
          <p>Email: {{ selectedUpdate.card.email }} → {{ selectedUpdate.requested.email }}</p>
          <p>Website: {{ selectedUpdate.card.website }} → {{ selectedUpdate.requested.website }}</p>
          <p v-if="selectedUpdate.note">Note: {{ selectedUpdate.note }}</p>
        </div>
      </template>
    </USlideover>
  </div>
</template>
