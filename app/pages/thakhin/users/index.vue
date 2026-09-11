<script setup lang="ts">
definePageMeta({
  layout: 'thakhin',
});

import type { DropdownMenuItem, TableColumn } from '@nuxt/ui';

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string | null;
  createdAt: string;
  label: string;
};

const toast = useToast();
const { data: session } = await authClient.useSession(useFetch);

const {
  data: usersData,
  pending,
  refresh,
} = await useFetch<UserRow[]>('/api/users/admin', { default: () => [] });

const rows = computed(() => usersData.value || []);
const globalQuery = ref('');
const page = ref(1);
const itemsPerPage = 10;

const isDeleteOpen = ref(false);
const isDeleting = ref(false);
const userToDelete = ref<UserRow | null>(null);

const filteredRows = computed(() => {
  const q = globalQuery.value.trim().toLowerCase();
  if (!q) return rows.value;

  return rows.value.filter((row) => {
    return (
      row.name.toLowerCase().includes(q) ||
      row.email.toLowerCase().includes(q) ||
      (row.role || '').toLowerCase().includes(q)
    );
  });
});

const total = computed(() => filteredRows.value.length);
const pagedRows = computed(() => {
  const start = (page.value - 1) * itemsPerPage;
  return filteredRows.value.slice(start, start + itemsPerPage);
});

watch([filteredRows, total], () => {
  const maxPage = Math.max(1, Math.ceil(total.value / itemsPerPage));
  if (page.value > maxPage) page.value = maxPage;
});

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
    await refresh();
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
  { accessorKey: 'name', header: 'NAME' },
  { accessorKey: 'email', header: 'EMAIL' },
  { accessorKey: 'role', header: 'ROLE' },
  { accessorKey: 'createdAt', header: 'CREATED' },
  { id: 'actions', header: '' },
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
          v-model="globalQuery"
          icon="i-lucide-search"
          placeholder="Search name or email"
          class="w-64"
          size="xl"
        />
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
    </div>

    <div class="hide-scrollbar flex-1 overflow-x-auto overflow-y-hidden">
      <UTable
        :data="pagedRows"
        :columns="columns"
        :loading="pending"
        :ui="{
          th: 'px-4 py-4 border-b border-[#232323] text-xs font-semibold tracking-wide uppercase text-white',
          td: 'px-4 py-4 border-b border-[#232323] text-sm text-[#8b8b8b]',
          tr: 'bg-transparent',
          empty: 'py-16 text-center text-sm text-muted',
        }"
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
        v-model:page="page"
        :total="total"
        :items-per-page="itemsPerPage"
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
