<script setup lang="ts">
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui';
import {
  ADMIN_ACTIONS_COLUMN,
  ADMIN_TABLE_UI,
  sortableHeader,
} from '~/features/admin/utils/admin-table';
import {
  ADMIN_DANGER_BUTTON_CLASS,
  ADMIN_PAGE_CLASS,
  ADMIN_SEARCH_UI,
  ADMIN_SLIDEOVER_UI,
  ADMIN_TABS_UI,
  type AdminPillTone,
} from '~/features/admin/utils/admin-ui';
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
const kind = useQueryState<FeedbackKind | 'all'>('kind', 'all');
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

const KIND_TONES: Record<FeedbackKind, AdminPillTone> = {
  feedback: 'info',
  bug_report: 'error',
  feature_request: 'gold',
};

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
        label: 'Open',
        icon: 'i-lucide-mail-open',
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
  <div :class="ADMIN_PAGE_CLASS">
    <AdminPageHeader
      title="Inbox"
      description-class="max-w-115"
      description="Feedback, bug reports, and feature requests from people on the platform. Open the person or organization, or delete the&nbsp;message."
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
          color="neutral"
          variant="soft"
          class="w-full sm:w-72"
          :ui="ADMIN_SEARCH_UI"
        />
        <UTabs
          :model-value="kind"
          :items="[...tabs]"
          :content="false"
          color="neutral"
          variant="pill"
          :ui="ADMIN_TABS_UI"
          @update:model-value="selectKind($event as FeedbackKind | 'all')"
        />
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
          <AdminStatusPill
            :label="kindLabel(row.original.kind)"
            :tone="KIND_TONES[row.original.kind]"
          />
        </template>
        <template #userName-cell="{ row }">
          <span class="font-medium text-ink">{{ row.original.userName }}</span>
        </template>
        <template #message-cell="{ row }">
          <span class="line-clamp-2 max-w-md text-soft">{{
            row.original.message
          }}</span>
        </template>
        <template #createdAt-cell="{ row }">
          <span class="text-muted">{{
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
      side="right"
      inset
      :ui="ADMIN_SLIDEOVER_UI"
    >
      <template #body>
        <div v-if="selected" class="space-y-4 text-sm text-soft">
          <p class="whitespace-pre-wrap text-ink">{{ selected.message }}</p>
          <p>{{ selected.userName }} • {{ selected.userEmail }}</p>
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
            :class="ADMIN_DANGER_BUTTON_CLASS"
            @click="askDeleteSelected"
          />
          <UButton
            :to="`${ROUTES.THAKHIN.USERS}?focus=${selected.userId}`"
            label="Open person"
            color="neutral"
            class="h-10 cursor-pointer rounded-full bg-raised px-5 text-sm font-medium text-ink hover:bg-line"
          />
          <UButton
            :to="`${ROUTES.THAKHIN.ORGANIZATIONS}?focus=${selected.organizationId}`"
            label="Open organization"
            color="neutral"
            class="h-10 cursor-pointer rounded-full bg-raised px-5 text-sm font-medium text-ink hover:bg-line"
          />
        </template>
      </template>
    </USlideover>

    <UModal
      v-model:open="isDeleteOpen"
      :close="false"
      :dismissible="!isDeleting"
      :ui="{ content: 'bg-surface max-w-md' }"
      title="Delete message?"
    >
      <template #body>
        <p class="text-sm text-soft">
          This removes the message from
          <span class="text-ink">{{ messageToDelete?.userEmail }}</span
          >. The person and organization stay.
        </p>
      </template>
      <template #footer>
        <UButton
          label="Cancel"
          color="neutral"
          variant="ghost"
          class="h-10 cursor-pointer rounded-full px-5 text-sm font-medium"
          :disabled="isDeleting"
          @click="closeDelete"
        />
        <UButton
          label="Delete"
          color="error"
          class="h-10 cursor-pointer rounded-full px-6 text-sm font-medium"
          :loading="isDeleting"
          @click="onConfirmDelete"
        />
      </template>
    </UModal>
  </div>
</template>
