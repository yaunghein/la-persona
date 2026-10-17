<script setup lang="ts">
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui';
import {
  ADMIN_ACTIONS_COLUMN,
  ADMIN_TABLE_UI,
  sortableHeader,
} from '~/features/admin/utils/admin-table';
import {
  FEEDBACK_KIND_LABELS,
  type FeedbackForReview,
  type FeedbackKind,
} from '~~/shared/contracts/feedback';

definePageMeta({
  layout: 'thakhin',
});

type FeedbackRow = FeedbackForReview;

const toast = useToast();
const invalidateAdmin = useInvalidateAdmin();
const route = useRoute();
const kind = ref<FeedbackKind | 'all'>('all');
const selected = ref<FeedbackRow | null>(null);
const detailOpen = computed({
  get: () => Boolean(selected.value),
  set: (open: boolean) => {
    if (!open) selected.value = null;
  },
});

const tabs = [
  { label: 'All', value: 'all' },
  { label: FEEDBACK_KIND_LABELS.feedback, value: 'feedback' },
  { label: FEEDBACK_KIND_LABELS.bug_report, value: 'bug_report' },
  { label: FEEDBACK_KIND_LABELS.feature_request, value: 'feature_request' },
] as const;

const { data, isLoading } = useAdminFeedbackQuery(kind);

const rows = computed(() => data.value || []);
const {
  globalFilter,
  sorting,
  pagination,
  paginationOptions,
  paginationTotal,
  resetPage,
  onPageChange,
} = useAdminTable(() => rows.value.length);

watch(kind, resetPage);

const columns: TableColumn<FeedbackRow>[] = [
  { accessorKey: 'kind', header: sortableHeader('KIND') },
  { accessorKey: 'userName', header: sortableHeader('FROM') },
  { accessorKey: 'userEmail', header: sortableHeader('EMAIL') },
  { accessorKey: 'organizationName', header: sortableHeader('ORGANIZATION') },
  { accessorKey: 'message', header: sortableHeader('MESSAGE') },
  { accessorKey: 'createdAt', header: sortableHeader('CREATED') },
  ADMIN_ACTIONS_COLUMN,
];

function onSelect(_event: Event, row: { original: FeedbackRow }) {
  selected.value = row.original;
}

const messageToDelete = ref<FeedbackRow | null>(null);
const isDeleteOpen = ref(false);
const isDeleting = ref(false);

function kindLabel(kind: string) {
  return FEEDBACK_KIND_LABELS[kind as FeedbackKind] || kind;
}

function selectKind(value: FeedbackKind | 'all') {
  kind.value = value;
}

function askDeleteSelected() {
  if (!selected.value) return;
  messageToDelete.value = selected.value;
  isDeleteOpen.value = true;
}

function closeDelete() {
  isDeleteOpen.value = false;
}

async function onConfirmDelete() {
  if (!messageToDelete.value) return;
  isDeleting.value = true;
  try {
    await adminApi.deleteFeedback(messageToDelete.value.id);
    await invalidateAdmin();
    toast.add({ title: 'Message deleted', color: 'success' });
    if (selected.value?.id === messageToDelete.value.id) selected.value = null;
    isDeleteOpen.value = false;
    messageToDelete.value = null;
  } catch (error: any) {
    toast.add({
      title: 'Delete failed',
      description: error?.data?.statusMessage || 'Please try again.',
      color: 'error',
    });
  } finally {
    isDeleting.value = false;
  }
}

function rowMenu(row: FeedbackRow): DropdownMenuItem[][] {
  return [
    [
      {
        label: 'View',
        icon: 'i-lucide-eye',
        onSelect: () => {
          selected.value = row;
        },
      },
      {
        label: 'Delete',
        icon: 'i-lucide-trash-2',
        color: 'error',
        onSelect: () => {
          messageToDelete.value = row;
          isDeleteOpen.value = true;
        },
      },
    ],
  ];
}

onMounted(() => {
  const focus = String(route.query.focus || '');
  if (!focus) return;
  const match = rows.value.find((row) => row.id === focus);
  if (match) selected.value = match;
});
</script>

<template>
  <div class="flex flex-col gap-6">
    <AdminPageHeader
      title="Inbox"
      description="Feedback, bug reports, and feature requests. Open the person or organization, or delete the message."
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
          icon="i-lucide-search"
          placeholder="Search message, name, or email"
          class="w-72"
          size="sm"
        />
        <div class="flex flex-wrap gap-1">
          <UButton
            v-for="tab in tabs"
            :key="tab.value"
            size="sm"
            :label="tab.label"
            :color="kind === tab.value ? 'primary' : 'neutral'"
            :variant="kind === tab.value ? 'soft' : 'ghost'"
            @click="selectKind(tab.value)"
          />
        </div>
      </template>

      <UTable
        ref="table"
        v-model:global-filter="globalFilter"
        v-model:sorting="sorting"
        v-model:pagination="pagination"
        :data="rows"
        :columns="columns"
        :loading="isLoading"
        :pagination-options="paginationOptions"
        :get-row-id="(row) => row.id"
        :ui="ADMIN_TABLE_UI"
        class="w-full"
        @select="onSelect"
      >
        <template #kind-cell="{ row }">
          <UBadge color="neutral" variant="subtle">
            {{ kindLabel(row.original.kind) }}
          </UBadge>
        </template>
        <template #userName-cell="{ row }">
          <span class="font-medium text-white">{{
            row.original.userName
          }}</span>
        </template>
        <template #message-cell="{ row }">
          <span class="line-clamp-2 max-w-md text-white/70">{{
            row.original.message
          }}</span>
        </template>
        <template #createdAt-cell="{ row }">
          <span class="text-white/55">{{
            new Date(row.original.createdAt).toLocaleString()
          }}</span>
        </template>
        <template #actions-cell="{ row }">
          <AdminRowMenu :items="rowMenu(row.original)" />
        </template>
      </UTable>
    </AdminTableFrame>

    <USlideover
      v-model:open="detailOpen"
      :title="selected ? kindLabel(selected.kind) : 'Message'"
      :ui="{ content: 'bg-[#171717]' }"
    >
      <template #body>
        <div v-if="selected" class="space-y-4 text-sm text-white/80">
          <p class="whitespace-pre-wrap text-white">{{ selected.message }}</p>
          <p>{{ selected.userName }} · {{ selected.userEmail }}</p>
          <p>{{ selected.organizationName }}</p>
        </div>
      </template>

      <template #footer>
        <template v-if="selected">
          <UButton
            label="Delete"
            leading-icon="i-lucide-trash-2"
            color="error"
            variant="soft"
            class="h-10 cursor-pointer rounded-full px-5 text-sm font-medium"
            @click="askDeleteSelected"
          />
          <UButton
            :to="`${ROUTES.THAKHIN.USERS}?focus=${selected.userId}`"
            label="Open person"
            color="neutral"
            class="h-10 cursor-pointer rounded-full bg-[#232323] px-5 text-sm font-medium text-white hover:bg-[#2a2a2a]"
          />
          <UButton
            :to="`${ROUTES.THAKHIN.ORGANIZATIONS}?focus=${selected.organizationId}`"
            label="Open organization"
            color="neutral"
            class="h-10 cursor-pointer rounded-full bg-[#232323] px-5 text-sm font-medium text-white hover:bg-[#2a2a2a]"
          />
        </template>
      </template>
    </USlideover>

    <UModal
      v-model:open="isDeleteOpen"
      :close="false"
      :dismissible="!isDeleting"
      :ui="{ content: 'bg-[#171717] max-w-md' }"
      title="Delete message?"
    >
      <template #body>
        <p class="text-sm text-white/70">
          This removes the message from
          <span class="text-white">{{ messageToDelete?.userEmail }}</span
          >. The person and organization stay.
        </p>
      </template>
      <template #footer>
        <UButton
          label="Cancel"
          color="neutral"
          variant="ghost"
          :disabled="isDeleting"
          @click="closeDelete"
        />
        <UButton
          label="Delete"
          color="error"
          :loading="isDeleting"
          @click="onConfirmDelete"
        />
      </template>
    </UModal>
  </div>
</template>
