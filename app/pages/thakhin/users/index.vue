<script setup lang="ts">
definePageMeta({
  layout: 'thakhin',
});

import type { DropdownMenuItem, TableColumn } from '@nuxt/ui';
import {
  ADMIN_ACTIONS_COLUMN,
  ADMIN_TABLE_UI,
  sortableHeader,
} from '~/features/admin/utils/admin-table';
import {
  ADMIN_FILTER_UI,
  ADMIN_DANGER_BUTTON_CLASS,
  ADMIN_GHOST_BUTTON_CLASS,
  ADMIN_PAGE_CLASS,
  ADMIN_PRIMARY_BUTTON_CLASS,
  ADMIN_SEARCH_UI,
  ADMIN_SLIDEOVER_BUTTON_CLASS,
  ADMIN_SLIDEOVER_UI,
} from '~/features/admin/utils/admin-ui';
import type {
  AdminUserDetail,
  AdminUserSummary,
} from '~~/shared/contracts/account';

type UserRow = AdminUserSummary;
type UserDetail = AdminUserDetail;

const toast = useToast();
const invalidateAdmin = useInvalidateAdmin();
const { data: session } = await authClient.useSession(useFetch);

const { data: usersData, isLoading: pending } = useAdminUsersQuery();

const rows = computed(() => usersData.value || []);
const roleFilter = useQueryState<'all' | 'admin' | 'user'>('role', 'all');
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

const historyOpen = ref(false);
const historyUserId = ref<string | null>(null);

function openHistory(row: UserRow) {
  historyUserId.value = row.id;
  historyOpen.value = true;
}

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
} = useAdminTable(() => filteredRows.value.length);

watch(roleFilter, resetPage);

const roleFilterItems = [
  { label: 'All roles', value: 'all' },
  { label: 'Admin', value: 'admin' },
  { label: 'User', value: 'user' },
];

function closeCreate() {
  isCreateOpen.value = false;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

async function openDetail(row: UserRow) {
  detailOpen.value = true;
  detail.value = null;
  detail.value = await adminApi.getUser(row.id);
  editName.value = detail.value.name;
  editRole.value = detail.value.role === 'admin' ? 'admin' : 'user';
}

async function openDelete(row: UserRow) {
  userToDelete.value = row;
  deletePreview.value = null;
  isDeleteOpen.value = true;
  const full = await adminApi.getUser(row.id);
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
    await adminApi.deleteUser(userToDelete.value.id);
    await invalidateAdmin();
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
        label: 'Edit',
        icon: 'i-lucide-pencil',
        onSelect: () => openDetail(row),
      },
      {
        label: 'History',
        icon: 'i-lucide-history',
        onSelect: () => openHistory(row),
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
    await adminApi.updateUser(row.id, body);
    await invalidateAdmin();
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

const isSelfDetail = computed(() =>
  Boolean(detail.value && session.value?.user?.id === detail.value.id)
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
    await adminApi.createUser({
      name: createForm.name.trim(),
      email: createForm.email.trim(),
      password: createForm.password,
      role: createForm.role,
    });
    await invalidateAdmin();
    toast.add({
      title: 'Person created',
      description:
        'They can sign in with that email and password. A personal organization was created for them.',
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

const formFieldClass =
  '[&_label]:mb-3 [&_label]:text-sm [&_label]:font-medium [&_label]:text-ink';

const inputUi = {
  base: 'h-[47px] rounded-[4px] border-line bg-raised text-sm text-ink placeholder:text-ink/50',
};

const selectUi = {
  base: 'h-[47px] w-full rounded-[4px] border-line bg-raised px-3 text-sm text-ink',
  content: 'border border-line bg-raised',
  item: 'text-ink data-[highlighted]:bg-raised',
  value: 'text-ink',
};

const columns: TableColumn<UserRow>[] = [
  { accessorKey: 'name', header: sortableHeader('NAME') },
  { accessorKey: 'email', header: sortableHeader('EMAIL') },
  {
    accessorKey: 'role',
    header: sortableHeader('ROLE'),
    accessorFn: (row) => (row.role === 'admin' ? 'Admin' : 'User'),
  },
  {
    accessorKey: 'banned',
    header: sortableHeader('STATUS'),
    accessorFn: (row) => (row.banned ? 'Banned' : 'Active'),
  },
  { accessorKey: 'createdAt', header: sortableHeader('CREATED') },
  ADMIN_ACTIONS_COLUMN,
];
</script>

<template>
  <div :class="ADMIN_PAGE_CLASS">
    <AdminPageHeader
      title="People"
      description-class="max-w-88"
      description="Create an account, correct a name or role, ban, or delete. Deleting also removes their personal&nbsp;organization."
    >
      <UButton
        label="Create"
        leading-icon="i-lucide-plus"
        color="neutral"
        :class="ADMIN_PRIMARY_BUTTON_CLASS"
        @click="openCreate"
      />
    </AdminPageHeader>

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
          placeholder="Search name or email"
          color="neutral"
          variant="soft"
          class="w-full sm:w-64"
          :ui="ADMIN_SEARCH_UI"
        />
        <USelect
          v-model="roleFilter"
          :items="roleFilterItems"
          class="w-full sm:w-40"
          :ui="ADMIN_FILTER_UI"
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
        class="w-full"
        @select="(_event, row) => openDetail(row.original)"
      >
        <template #name-cell="{ row }">
          <span class="font-medium text-ink">{{ row.original.name }}</span>
        </template>
        <template #email-cell="{ row }">
          <span class="text-soft">{{ row.original.email }}</span>
        </template>
        <template #role-cell="{ row }">
          <AdminStatusPill
            :label="row.original.role === 'admin' ? 'Admin' : 'User'"
            :tone="row.original.role === 'admin' ? 'gold' : 'ink'"
          />
        </template>
        <template #banned-cell="{ row }">
          <AdminStatusPill
            :label="row.original.banned ? 'Banned' : 'Active'"
            :tone="row.original.banned ? 'error' : 'success'"
          />
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

    <UModal
      v-model:open="isDeleteOpen"
      :close="false"
      :dismissible="!isDeleting"
      :ui="{
        content: 'bg-surface max-w-md',
        title: 'text-ink',
        body: 'pt-4',
        footer: 'justify-end gap-2',
      }"
      title="Delete user?"
    >
      <template #body>
        <div class="space-y-3 text-sm leading-relaxed text-soft">
          <p>
            This cannot be undone. The account
            <span class="font-medium text-ink">
              "{{ userToDelete?.email }}"
            </span>
            will be removed.
          </p>
          <div v-if="deletePreview">
            <p class="text-ink">Personal organizations that will be deleted</p>
            <p v-if="deletePreview.personalOrganizations.length === 0">None.</p>
            <ul v-else class="list-disc pl-5">
              <li
                v-for="org in deletePreview.personalOrganizations"
                :key="org.id"
              >
                {{ org.name }} ({{ org.cardCount }} cards)
              </li>
            </ul>
            <p class="mt-3 text-ink">Community memberships that will drop</p>
            <p v-if="deletePreview.communityMemberships.length === 0">
              None. Those organizations stay.
            </p>
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
          label="Cancel"
          color="neutral"
          variant="ghost"
          :class="ADMIN_GHOST_BUTTON_CLASS"
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

    <USlideover
      v-model:open="detailOpen"
      title="Edit person"
      :description="detail?.email"
      side="right"
      inset
      :ui="ADMIN_SLIDEOVER_UI"
    >
      <template #body>
        <form
          v-if="detail"
          id="edit-person-form"
          class="flex flex-col gap-4"
          @submit.prevent="saveDetail"
        >
          <UFormField label="Name" required :class="formFieldClass">
            <UInput
              v-model="editName"
              required
              class="w-full"
              size="xl"
              :ui="inputUi"
            />
          </UFormField>
          <UFormField label="Role" :class="formFieldClass">
            <USelect
              v-model="editRole"
              :disabled="isSelfDetail"
              :items="[
                { label: 'User', value: 'user' },
                { label: 'Admin', value: 'admin' },
              ]"
              class="w-full"
              size="xl"
              :ui="selectUi"
            />
          </UFormField>
        </form>
      </template>

      <template #footer>
        <template v-if="detail">
          <UButton
            label="Delete"
            leading-icon="i-lucide-trash-2"
            color="error"
            variant="soft"
            :disabled="isSelfDetail"
            :class="ADMIN_DANGER_BUTTON_CLASS"
            @click="openDelete(detail)"
          />
          <UButton
            :label="detail.banned ? 'Unban' : 'Ban'"
            leading-icon="i-lucide-ban"
            color="error"
            variant="soft"
            :disabled="isSelfDetail"
            :class="ADMIN_DANGER_BUTTON_CLASS"
            @click="patchUser(detail, { banned: !detail.banned })"
          />
          <UButton
            label="Save"
            type="submit"
            form="edit-person-form"
            color="neutral"
            :loading="isSaving"
            :class="ADMIN_SLIDEOVER_BUTTON_CLASS"
          />
        </template>
      </template>
    </USlideover>

    <USlideover
      v-model:open="isCreateOpen"
      title="Create person"
      side="right"
      inset
      :ui="ADMIN_SLIDEOVER_UI"
    >
      <template #body>
        <form
          id="create-person-form"
          novalidate
          @submit.prevent="onCreate"
          class="flex flex-col gap-4"
        >
          <UFormField label="Name" required :class="formFieldClass">
            <UInput
              v-model="createForm.name"
              required
              class="w-full"
              size="xl"
              placeholder="Full name"
              :ui="inputUi"
            />
          </UFormField>
          <UFormField label="Email" required :class="formFieldClass">
            <UInput
              v-model="createForm.email"
              type="email"
              required
              class="w-full"
              size="xl"
              :ui="inputUi"
            />
          </UFormField>
          <UFormField label="Password" required :class="formFieldClass">
            <UInput
              v-model="createForm.password"
              type="password"
              required
              class="w-full"
              size="xl"
              placeholder="At least 8 characters"
              :ui="inputUi"
            />
          </UFormField>
          <UFormField label="Role" :class="formFieldClass">
            <USelect
              v-model="createForm.role"
              :items="[
                { label: 'User', value: 'user' },
                { label: 'Admin', value: 'admin' },
              ]"
              class="w-full"
              size="xl"
              :ui="selectUi"
            />
          </UFormField>
        </form>
      </template>

      <template #footer>
        <UButton
          label="Cancel"
          color="neutral"
          variant="ghost"
          :class="ADMIN_GHOST_BUTTON_CLASS"
          @click="closeCreate"
        />
        <UButton
          label="Create"
          color="neutral"
          :loading="isCreating"
          :class="ADMIN_SLIDEOVER_BUTTON_CLASS"
          type="submit"
          form="create-person-form"
        />
      </template>
    </USlideover>

    <AdminPeriodHistorySlideover
      v-model:open="historyOpen"
      :user-id="historyUserId"
    />
  </div>
</template>
