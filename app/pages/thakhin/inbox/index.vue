<script setup lang="ts">
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { useThakhinTable } from '~/composables/thakhin-table';
import {
  THAKHIN_ACTIONS_COLUMN,
  THAKHIN_TABLE_UI,
  thakhinSortableHeader,
} from '~/utils/thakhin-table';
import { FEEDBACK_KIND_LABELS, type FeedbackKind } from '~~/shared/types/feedback';

definePageMeta({
  layout: 'thakhin',
});

type FeedbackRow = {
  id: string;
  kind: FeedbackKind;
  message: string;
  createdAt: string;
  userId: string;
  userName: string;
  userEmail: string;
  organizationId: string;
  organizationName: string;
};

const toast = useToast();
const queryClient = useQueryClient();
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

const { data, isLoading } = useQuery({
  queryKey: computed(() => [...QUERY_KEYS.adminFeedback, kind.value]),
  queryFn: () =>
    $fetch<FeedbackRow[]>('/api/admin/feedback', {
      query: kind.value === 'all' ? {} : { kind: kind.value },
    }),
});

const rows = computed(() => data.value || []);
const {
  globalFilter,
  sorting,
  pagination,
  paginationOptions,
  paginationTotal,
  resetPage,
  onPageChange,
} = useThakhinTable(() => rows.value.length);

watch(kind, resetPage);

const columns: TableColumn<FeedbackRow>[] = [
  { accessorKey: 'kind', header: thakhinSortableHeader('KIND') },
  { accessorKey: 'userName', header: thakhinSortableHeader('FROM') },
  { accessorKey: 'userEmail', header: thakhinSortableHeader('EMAIL') },
  { accessorKey: 'organizationName', header: thakhinSortableHeader('ORGANIZATION') },
  { accessorKey: 'message', header: thakhinSortableHeader('MESSAGE') },
  { accessorKey: 'createdAt', header: thakhinSortableHeader('CREATED') },
  THAKHIN_ACTIONS_COLUMN,
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

async function onConfirmDelete() {
  if (!messageToDelete.value) return;
  isDeleting.value = true;
  try {
    await $fetch(`/api/admin/feedback/${messageToDelete.value.id}`, {
      method: 'DELETE',
    });
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminFeedback });
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
    <ThakhinPageHeader
      title="Inbox"
      description="Feedback, bug reports, and feature requests. Open the person or organization, or delete the message."
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
            @click="kind = tab.value"
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
        :ui="THAKHIN_TABLE_UI"
        class="w-full"
        @select="onSelect"
      >
        <template #kind-cell="{ row }">
          <UBadge color="neutral" variant="subtle">
            {{ kindLabel(row.original.kind) }}
          </UBadge>
        </template>
        <template #userName-cell="{ row }">
          <span class="font-medium text-white">{{ row.original.userName }}</span>
        </template>
        <template #message-cell="{ row }">
          <span class="line-clamp-2 max-w-md text-white/70">{{ row.original.message }}</span>
        </template>
        <template #createdAt-cell="{ row }">
          <span class="text-white/55">{{ new Date(row.original.createdAt).toLocaleString() }}</span>
        </template>
        <template #actions-cell="{ row }">
          <ThakhinRowMenu :items="rowMenu(row.original)" />
        </template>
      </UTable>
    </ThakhinTableFrame>

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
          <div class="flex gap-2">
            <UButton
              :to="`${ROUTES.THAKHIN.USERS}?focus=${selected.userId}`"
              label="Open person"
              color="neutral"
              variant="outline"
            />
            <UButton
              :to="`${ROUTES.THAKHIN.ORGANIZATIONS}?focus=${selected.organizationId}`"
              label="Open organization"
              color="neutral"
              variant="outline"
            />
          </div>
          <UButton
            label="Delete"
            size="sm"
            color="error"
            variant="outline"
            @click="
              () => {
                if (!selected) return;
                messageToDelete.value = selected;
                isDeleteOpen.value = true;
              }
            "
          />
        </div>
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
          <span class="text-white">{{ messageToDelete?.userEmail }}</span>.
          The person and organization stay.
        </p>
      </template>
      <template #footer>
        <UButton
          label="Cancel"
          color="neutral"
          variant="ghost"
          :disabled="isDeleting"
          @click="isDeleteOpen = false"
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
