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

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string | null;
  createdAt: string;
  label: string;
};

const toast = useToast();
const queryClient = useQueryClient();
const { data: session } = await authClient.useSession(useFetch);

const { data: usersData, isLoading: pending } = useQuery({
  queryKey: QUERY_KEYS.adminUsers,
  queryFn: () => $fetch<UserRow[]>('/api/users/admin'),
});

const rows = computed(() => usersData.value || []);
const roleFilter = ref<'all' | 'admin' | 'user'>('all');

const isDeleteOpen = ref(false);
const isDeleting = ref(false);
const userToDelete = ref<UserRow | null>(null);

const filteredRows = computed(() => {
  if (roleFilter.value === 'all') return rows.value;

  return rows.value.filter((row) => {
    const role = row.role === 'admin' ? 'admin' : 'user';
    return role === roleFilter.value;
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

watch(roleFilter, resetPage);

const roleFilterItems = [
  { label: 'All roles', value: 'all' },
  { label: 'Admin', value: 'admin' },
  { label: 'User', value: 'user' },
];

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function openDelete(row: UserRow) {
  userToDelete.value = row;
  isDeleteOpen.value = true;
}

function closeDelete() {
  if (isDeleting.value) return;
  isDeleteOpen.value = false;
  userToDelete.value = null;
}

async function onConfirmDelete() {
  if (!userToDelete.value) return;

  isDeleting.value = true;
  try {
    await $fetch(`/api/users/admin/${userToDelete.value.id}`, {
      method: 'DELETE',
    });
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminUsers });
    toast.add({
      title: 'User deleted',
      description: `${userToDelete.value.email} and their personal workspace were removed.`,
      color: 'success',
    });
    isDeleteOpen.value = false;
    userToDelete.value = null;
  } catch (error: any) {
    toast.add({
      title: 'Delete failed',
      description:
        error?.data?.statusMessage ||
        error?.statusMessage ||
        'Please try again.',
      color: 'error',
    });
  } finally {
    isDeleting.value = false;
  }
}

function getActionItems(row: UserRow): DropdownMenuItem[][] {
  const isSelf = session.value?.user?.id === row.id;

  return [
    [
      {
        label: isSelf ? 'Cannot delete yourself' : 'Delete',
        icon: 'i-lucide-trash-2',
        color: 'error',
        disabled: isSelf,
        onSelect: () => {
          if (!isSelf) openDelete(row);
        },
      },
    ],
  ];
}

const columns: TableColumn<UserRow>[] = [
  { accessorKey: 'name', header: thakhinSortableHeader('NAME') },
  { accessorKey: 'email', header: thakhinSortableHeader('EMAIL') },
  {
    accessorKey: 'role',
    header: thakhinSortableHeader('ROLE'),
    accessorFn: (row) => row.role || 'user',
  },
  { accessorKey: 'createdAt', header: thakhinSortableHeader('CREATED') },
  THAKHIN_ACTIONS_COLUMN,
];
</script>

<template>
  <div class="flex min-h-[calc(100dvh-11rem)] flex-col gap-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1
        class="text-[1.75rem] font-normal leading-tight tracking-widest uppercase"
      >
        Users
      </h1>
      <div class="flex flex-wrap items-center gap-2">
        <UInput
          v-model="globalFilter"
          icon="i-lucide-search"
          placeholder="Search name or email"
          class="w-64"
          size="xl"
        />
        <USelect
          v-model="roleFilter"
          :items="roleFilterItems"
          class="w-40"
          size="xl"
        />
      </div>
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
        class="w-full min-w-225"
      >
        <template #name-cell="{ row }">
          <span class="font-medium text-white">{{ row.original.name }}</span>
        </template>
        <template #email-cell="{ row }">
          <span class="text-white/90">{{ row.original.email }}</span>
        </template>
        <template #role-cell="{ row }">
          <UBadge
            :color="row.original.role === 'admin' ? 'primary' : 'neutral'"
            variant="soft"
            class="uppercase"
          >
            {{ row.original.role || 'user' }}
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

    <UModal
      v-model:open="isDeleteOpen"
      :close="false"
      :dismissible="!isDeleting"
      :ui="{
        content: 'bg-[#171717] max-w-md',
        title: 'text-white',
        body: 'pt-4',
        footer: 'justify-end gap-2',
      }"
      title="Delete user?"
    >
      <template #body>
        <p class="text-sm leading-relaxed text-[#bcbcbc]">
          This cannot be undone. The account
          <span class="font-medium text-white">
            "{{ userToDelete?.email }}"
          </span>
          and their personal workspace will be removed. Community organizations
          they belong to will stay.
        </p>
      </template>
      <template #footer>
        <UButton
          size="xl"
          label="Cancel"
          color="neutral"
          variant="ghost"
          class="rounded-full px-5 text-white hover:bg-[#232323]"
          :disabled="isDeleting"
          @click="closeDelete"
        />
        <UButton
          size="xl"
          label="Delete"
          color="error"
          class="rounded-full px-6 font-medium"
          :loading="isDeleting"
          @click="onConfirmDelete"
        />
      </template>
    </UModal>
  </div>
</template>
