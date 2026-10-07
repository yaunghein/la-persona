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
  banned: boolean;
  createdAt: string;
  label: string;
};

type UserDetail = UserRow & {
  memberships: {
    id: string;
    role: string;
    organizationId: string;
    organizationName: string;
    organizationType: string;
  }[];
  cards: { id: string; slug: string; firstName: string; lastName: string | null }[];
  deletion: {
    personalOrganizations: { id: string; name: string; cardCount: number }[];
    communityMemberships: { organizationId: string; organizationName: string }[];
  };
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
const route = useRoute();

watch(
  () => [route.query.focus, rows.value.length] as const,
  () => {
    const id = String(route.query.focus || '');
    if (!id) return;
    const row = rows.value.find((item) => item.id === id);
    if (row) openDetail(row);
  }
);

const isDeleteOpen = ref(false);
const isDeleting = ref(false);
const userToDelete = ref<UserRow | null>(null);
const deletePreview = ref<UserDetail['deletion'] | null>(null);
const detail = ref<UserDetail | null>(null);
const detailOpen = ref(false);
const isSaving = ref(false);
const isCreateOpen = ref(false);
const isCreating = ref(false);
const editName = ref('');
const editRole = ref<'user' | 'admin'>('user');
const createForm = reactive({
  name: '',
  email: '',
  password: '',
  role: 'user' as 'user' | 'admin',
});

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

async function openDetail(row: UserRow) {
  detailOpen.value = true;
  detail.value = null;
  detail.value = await $fetch<UserDetail>(`/api/users/admin/${row.id}`);
  editName.value = detail.value.name;
  editRole.value = detail.value.role === 'admin' ? 'admin' : 'user';
}

async function openDelete(row: UserRow) {
  userToDelete.value = row;
  deletePreview.value = null;
  isDeleteOpen.value = true;
  const full = await $fetch<UserDetail>(`/api/users/admin/${row.id}`);
  deletePreview.value = full.deletion;
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
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminOverview });
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
        label: 'View',
        icon: 'i-lucide-eye',
        onSelect: () => openDetail(row),
      },
      {
        label: row.role === 'admin' ? 'Make user' : 'Make admin',
        icon: 'i-lucide-shield',
        disabled: isSelf,
        onSelect: () =>
          patchUser(row, { role: row.role === 'admin' ? 'user' : 'admin' }),
      },
      {
        label: row.banned ? 'Unban' : 'Ban',
        icon: 'i-lucide-ban',
        disabled: isSelf,
        onSelect: () => patchUser(row, { banned: !row.banned }),
      },
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

async function patchUser(
  row: UserRow,
  body: { name?: string; role?: 'user' | 'admin'; banned?: boolean }
) {
  isSaving.value = true;
  try {
    await $fetch(`/api/users/admin/${row.id}`, { method: 'PATCH', body });
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminUsers });
    toast.add({ title: 'User updated', color: 'success' });
    if (detail.value?.id === row.id) await openDetail(row);
  } catch (error: any) {
    toast.add({
      title: 'Update failed',
      description: error?.data?.statusMessage || 'Please try again.',
      color: 'error',
    });
  } finally {
    isSaving.value = false;
  }
}

const isSelfDetail = computed(
  () => Boolean(detail.value && session.value?.user?.id === detail.value.id)
);

async function saveDetail() {
  if (!detail.value) return;
  const name = editName.value.trim();
  if (!name) {
    toast.add({ title: 'Name is required', color: 'warning' });
    return;
  }
  const body: { name?: string; role?: 'user' | 'admin' } = {};
  if (name !== detail.value.name) body.name = name;
  const currentRole = detail.value.role === 'admin' ? 'admin' : 'user';
  if (!isSelfDetail.value && editRole.value !== currentRole) {
    body.role = editRole.value;
  }
  if (!body.name && !body.role) return;
  await patchUser(detail.value, body);
}

function openCreate() {
  createForm.name = '';
  createForm.email = '';
  createForm.password = '';
  createForm.role = 'user';
  isCreateOpen.value = true;
}

async function onCreate() {
  if (!createForm.name.trim() || !createForm.email.trim()) {
    toast.add({ title: 'Name and email are required', color: 'warning' });
    return;
  }
  if (createForm.password.length < 8) {
    toast.add({
      title: 'Password must be at least 8 characters',
      color: 'warning',
    });
    return;
  }

  isCreating.value = true;
  try {
    await $fetch('/api/users/admin', {
      method: 'POST',
      body: {
        name: createForm.name.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        role: createForm.role,
      },
    });
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminUsers });
    await queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.adminOrganizations,
    });
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminOverview });
    toast.add({
      title: 'Person created',
      description: 'They can sign in with that email and password. A personal organization was created for them.',
      color: 'success',
    });
    isCreateOpen.value = false;
  } catch (error: any) {
    toast.add({
      title: 'Create failed',
      description: error?.data?.statusMessage || 'Please try again.',
      color: 'error',
    });
  } finally {
    isCreating.value = false;
  }
}

const columns: TableColumn<UserRow>[] = [
  { accessorKey: 'name', header: thakhinSortableHeader('NAME') },
  { accessorKey: 'email', header: thakhinSortableHeader('EMAIL') },
  {
    accessorKey: 'role',
    header: thakhinSortableHeader('ROLE'),
    accessorFn: (row) => row.role || 'user',
  },
  { accessorKey: 'banned', header: thakhinSortableHeader('BANNED') },
  { accessorKey: 'createdAt', header: thakhinSortableHeader('CREATED') },
  THAKHIN_ACTIONS_COLUMN,
];
</script>

<template>
  <div class="flex flex-col gap-6">
    <ThakhinPageHeader
      title="People"
      description="Create an account, correct a name or role, ban, or delete. Deleting a person also removes their personal organization."
    >
      <UButton
        size="sm"
        label="Create"
        icon="i-lucide-plus"
        color="neutral"
        variant="outline"
        @click="openCreate"
      />
    </ThakhinPageHeader>

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
          placeholder="Search name or email"
          class="w-64"
          size="sm"
        />
        <USelect
          v-model="roleFilter"
          :items="roleFilterItems"
          class="w-36"
          size="sm"
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
        class="w-full"
        @select="(_event, row) => openDetail(row.original)"
      >
        <template #name-cell="{ row }">
          <span class="font-medium text-white">{{ row.original.name }}</span>
        </template>
        <template #email-cell="{ row }">
          <span class="text-white/70">{{ row.original.email }}</span>
        </template>
        <template #role-cell="{ row }">
          <UBadge
            :color="row.original.role === 'admin' ? 'primary' : 'neutral'"
            variant="subtle"
          >
            {{ row.original.role || 'user' }}
          </UBadge>
        </template>
        <template #banned-cell="{ row }">
          <UBadge
            :color="row.original.banned ? 'error' : 'success'"
            variant="subtle"
          >
            {{ row.original.banned ? 'Banned' : 'Active' }}
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
        <div class="space-y-3 text-sm leading-relaxed text-[#bcbcbc]">
          <p>
            This cannot be undone. The account
            <span class="font-medium text-white">
              "{{ userToDelete?.email }}"
            </span>
            will be removed.
          </p>
          <div v-if="deletePreview">
            <p class="text-white">Personal organizations that will be deleted</p>
            <p v-if="deletePreview.personalOrganizations.length === 0">None.</p>
            <ul v-else class="list-disc pl-5">
              <li
                v-for="org in deletePreview.personalOrganizations"
                :key="org.id"
              >
                {{ org.name }} ({{ org.cardCount }} cards)
              </li>
            </ul>
            <p class="mt-3 text-white">Community memberships that will drop</p>
            <p v-if="deletePreview.communityMemberships.length === 0">None. Those organizations stay.</p>
            <ul v-else class="list-disc pl-5">
              <li
                v-for="org in deletePreview.communityMemberships"
                :key="org.organizationId"
              >
                {{ org.organizationName }}
              </li>
            </ul>
          </div>
        </div>
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

    <USlideover
      v-model:open="detailOpen"
      title="Person"
      :ui="{ content: 'bg-[#171717]' }"
    >
      <template #body>
        <div v-if="detail" class="space-y-4 text-sm text-white/80">
          <UFormField label="Name">
            <UInput v-model="editName" class="w-full" />
          </UFormField>
          <p>{{ detail.email }}</p>
          <UFormField label="Role">
            <USelect
              v-model="editRole"
              :disabled="isSelfDetail"
              :items="[
                { label: 'User', value: 'user' },
                { label: 'Admin', value: 'admin' },
              ]"
              class="w-full"
            />
          </UFormField>
          <p>{{ detail.banned ? 'Banned' : 'Active' }}</p>
          <div class="flex flex-wrap gap-2">
            <UButton
              label="Save"
              size="sm"
              color="neutral"
              :loading="isSaving"
              @click="saveDetail"
            />
            <UButton
              :label="detail.banned ? 'Unban' : 'Ban'"
              size="sm"
              color="neutral"
              variant="outline"
              :disabled="isSelfDetail"
              @click="patchUser(detail, { banned: !detail.banned })"
            />
            <UButton
              label="Delete"
              size="sm"
              color="error"
              variant="outline"
              :disabled="isSelfDetail"
              @click="detail && openDelete(detail)"
            />
          </div>
          <div>
            <p class="text-white">Organizations</p>
            <p v-if="detail.memberships.length === 0">None.</p>
            <p v-for="org in detail.memberships" :key="org.id">
              {{ org.organizationName }} · {{ org.organizationType }} · {{ org.role }}
            </p>
          </div>
          <div>
            <p class="text-white">Cards</p>
            <p v-if="detail.cards.length === 0">None.</p>
            <p v-for="card in detail.cards" :key="card.id">
              {{ card.firstName }} {{ card.lastName }} · {{ card.slug }}
            </p>
          </div>
        </div>
      </template>
    </USlideover>

    <USlideover
      v-model:open="isCreateOpen"
      title="Create person"
      :ui="{ content: 'bg-[#171717]' }"
    >
      <template #body>
        <div class="space-y-4">
          <UFormField label="Name" required>
            <UInput v-model="createForm.name" class="w-full" placeholder="Full name" />
          </UFormField>
          <UFormField label="Email" required>
            <UInput
              v-model="createForm.email"
              type="email"
              class="w-full"
              placeholder="name@example.com"
            />
          </UFormField>
          <UFormField label="Password" required>
            <UInput
              v-model="createForm.password"
              type="password"
              class="w-full"
              placeholder="At least 8 characters"
            />
          </UFormField>
          <UFormField label="Role">
            <USelect
              v-model="createForm.role"
              :items="[
                { label: 'User', value: 'user' },
                { label: 'Admin', value: 'admin' },
              ]"
              class="w-full"
            />
          </UFormField>
          <div class="flex justify-end gap-2 pt-2">
            <UButton
              label="Cancel"
              color="neutral"
              variant="ghost"
              @click="isCreateOpen = false"
            />
            <UButton
              label="Create"
              color="neutral"
              :loading="isCreating"
              @click="onCreate"
            />
          </div>
        </div>
      </template>
    </USlideover>
  </div>
</template>
