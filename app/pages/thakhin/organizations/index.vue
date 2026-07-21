<script setup lang="ts">
definePageMeta({
  layout: 'thakhin',
});

import type { DropdownMenuItem, TableColumn } from '@nuxt/ui';
import {
  ORGANIZATION_TYPES,
  ORGANIZATION_TYPE_LABELS,
  type OrganizationType,
} from '~~/shared/utils/constants';

type OrgRow = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  metadata: unknown;
  type: OrganizationType;
  createdAt: string;
  memberCount: number;
  cardCount: number;
};

const toast = useToast();

const isEditOpen = ref(false);
const isCreateOpen = ref(false);
const editingRow = ref<OrgRow | null>(null);
const isSaving = ref(false);
const isCreating = ref(false);

const editForm = reactive({
  name: '',
  slug: '',
});

const createForm = reactive({
  name: '',
  slug: '',
  type: ORGANIZATION_TYPES.EVENT_ORGANIZER as OrganizationType,
  ownerUserId: undefined as string | undefined,
});

const typeItems = [
  {
    label: ORGANIZATION_TYPE_LABELS[ORGANIZATION_TYPES.PERSONAL],
    value: ORGANIZATION_TYPES.PERSONAL,
  },
  {
    label: ORGANIZATION_TYPE_LABELS[ORGANIZATION_TYPES.EVENT_ORGANIZER],
    value: ORGANIZATION_TYPES.EVENT_ORGANIZER,
  },
];

type UserOption = {
  id: string;
  name: string;
  email: string;
  label: string;
  avatar?: { src: string };
};

const {
  data: orgsData,
  pending,
  refresh,
} = await useFetch<OrgRow[]>('/api/organizations/admin');

const { data: usersData, pending: usersPending } = await useFetch<UserOption[]>(
  '/api/users/admin',
  { default: () => [] }
);

const userItems = computed(() => usersData.value || []);

const rows = computed(() => orgsData.value || []);

const page = ref(1);
const itemsPerPage = 10;
const total = computed(() => rows.value.length);
const pagedRows = computed(() => {
  const start = (page.value - 1) * itemsPerPage;
  return rows.value.slice(start, start + itemsPerPage);
});

watch(rows, () => {
  const maxPage = Math.max(1, Math.ceil(total.value / itemsPerPage));
  if (page.value > maxPage) page.value = maxPage;
});

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function openEdit(row: OrgRow) {
  editingRow.value = row;
  editForm.name = row.name;
  editForm.slug = row.slug;
  isEditOpen.value = true;
}

function closeEdit() {
  isEditOpen.value = false;
  editingRow.value = null;
}

function openCreate() {
  createForm.name = '';
  createForm.slug = '';
  createForm.type = ORGANIZATION_TYPES.EVENT_ORGANIZER;
  createForm.ownerUserId = undefined;
  isCreateOpen.value = true;
}

function closeCreate() {
  isCreateOpen.value = false;
}

async function onSaveEdit() {
  if (!editingRow.value) return;
  const name = editForm.name.trim();
  const slug = editForm.slug.trim();
  if (!name || !slug) {
    toast.add({
      title: 'Missing fields',
      description: 'Name and slug are required.',
      color: 'warning',
    });
    return;
  }

  isSaving.value = true;
  try {
    await $fetch(`/api/organizations/admin/${editingRow.value.id}`, {
      method: 'PATCH',
      body: { name, slug },
    });
    await refresh();
    toast.add({
      title: 'Organization updated',
      color: 'success',
    });
    closeEdit();
  } catch (error: any) {
    toast.add({
      title: 'Update failed',
      description:
        error?.data?.statusMessage ||
        error?.statusMessage ||
        'Please try again.',
      color: 'error',
    });
  } finally {
    isSaving.value = false;
  }
}

async function onCreate() {
  const name = createForm.name.trim();
  if (!name) {
    toast.add({
      title: 'Missing fields',
      description: 'Name is required.',
      color: 'warning',
    });
    return;
  }

  isCreating.value = true;
  try {
    await $fetch('/api/organizations/admin', {
      method: 'POST',
      body: {
        name,
        type: createForm.type,
        slug: createForm.slug.trim() || undefined,
        ownerUserId: createForm.ownerUserId || undefined,
      },
    });
    await refresh();
    toast.add({
      title: 'Organization created',
      color: 'success',
    });
    closeCreate();
  } catch (error: any) {
    toast.add({
      title: 'Create failed',
      description:
        error?.data?.statusMessage ||
        error?.statusMessage ||
        'Please try again.',
      color: 'error',
    });
  } finally {
    isCreating.value = false;
  }
}

function getActionItems(row: OrgRow): DropdownMenuItem[][] {
  return [
    [
      {
        label: 'Edit',
        icon: 'i-lucide-pencil',
        onSelect: () => openEdit(row),
      },
    ],
  ];
}

function typeBadgeColor(type: OrganizationType) {
  return type === ORGANIZATION_TYPES.PERSONAL ? 'neutral' : 'primary';
}

const columns: TableColumn<OrgRow>[] = [
  { accessorKey: 'name', header: 'NAME' },
  { accessorKey: 'slug', header: 'SLUG' },
  { accessorKey: 'memberCount', header: 'MEMBERS' },
  { accessorKey: 'cardCount', header: 'CARDS' },
  { id: 'type', header: 'TYPE' },
  { accessorKey: 'createdAt', header: 'CREATED' },
  { id: 'actions', header: '' },
];

const formFieldClass =
  '[&_label]:mb-3 [&_label]:text-sm [&_label]:font-medium [&_label]:text-white';

const inputUi = {
  base: 'h-[47px] rounded-[4px] border-[#2a2a2a] bg-[#232323] text-sm text-white placeholder:text-white/50',
};

const selectUi = {
  base: 'h-[47px] w-full rounded-[4px] border-[#2a2a2a] bg-[#232323] px-3 text-sm text-white',
  content: 'border border-[#2a2a2a] bg-[#232323]',
  item: 'text-white data-[highlighted]:bg-[#232323]',
  value: 'text-white',
};

const selectMenuUi = {
  base: 'h-[47px] w-full rounded-[4px] border-[#2a2a2a] bg-[#232323] px-3 text-sm text-white',
  content: 'border border-[#2a2a2a] bg-[#232323]',
  item: 'text-white data-[highlighted]:bg-[#2a2a2a]',
  value: 'text-white',
  placeholder: 'text-white/50',
  input: 'bg-[#232323] text-white placeholder:text-white/50',
};
</script>

<template>
  <div class="flex min-h-[calc(100dvh-11rem)] flex-col gap-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1
        class="text-[1.75rem] font-normal leading-tight tracking-widest uppercase"
      >
        Organizations
      </h1>
      <div class="flex flex-wrap items-center gap-2">
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
        <UButton
          size="xl"
          label="Create Organization"
          icon="i-lucide-plus"
          color="neutral"
          class="rounded-full"
          @click="openCreate"
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
        <template #slug-cell="{ row }">
          <span class="font-mono text-white/90">{{ row.original.slug }}</span>
        </template>
        <template #memberCount-cell="{ row }">
          {{ row.original.memberCount }}
        </template>
        <template #cardCount-cell="{ row }">
          {{ row.original.cardCount }}
        </template>
        <template #type-cell="{ row }">
          <UBadge
            :color="typeBadgeColor(row.original.type)"
            variant="soft"
            class="uppercase"
          >
            {{ ORGANIZATION_TYPE_LABELS[row.original.type] }}
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

    <USlideover
      v-model:open="isCreateOpen"
      side="right"
      inset
      title="CREATE ORGANIZATION"
      :ui="{
        header: 'border-b-2 border-[#232323] px-6 py-6',
        title: 'text-sm font-medium tracking-[1.4px] text-white uppercase',
        body: 'px-6',
      }"
    >
      <template #body>
        <div class="py-2">
          <div class="flex flex-col gap-4">
            <UFormField label="Name" required :class="formFieldClass">
              <UInput
                v-model="createForm.name"
                placeholder="Organization name"
                class="w-full"
                size="xl"
                :ui="inputUi"
              />
            </UFormField>
            <UFormField label="Type" required :class="formFieldClass">
              <USelect
                v-model="createForm.type"
                :items="typeItems"
                class="w-full"
                size="xl"
                :ui="selectUi"
              />
            </UFormField>
            <UFormField label="Slug" :class="formFieldClass">
              <UInput
                v-model="createForm.slug"
                placeholder="optional — auto from name"
                class="w-full"
                size="xl"
                :ui="inputUi"
              />
            </UFormField>
            <UFormField label="Owner" :class="formFieldClass">
              <USelectMenu
                v-model="createForm.ownerUserId"
                value-key="id"
                :items="userItems"
                :loading="usersPending"
                clear
                placeholder="Search users by name or email..."
                :search-input="{
                  placeholder: 'Search...',
                  icon: 'i-lucide-search',
                }"
                :filter-fields="['label', 'name', 'email']"
                class="w-full"
                size="xl"
                :ui="selectMenuUi"
              />
            </UFormField>
          </div>

          <div
            class="mt-6 flex justify-end gap-2 border-t border-[#232323] pt-6"
          >
            <UButton
              size="xl"
              label="Cancel"
              color="neutral"
              variant="ghost"
              class="rounded-full px-5 text-white hover:bg-[#232323]"
              @click="closeCreate"
            />
            <UButton
              size="xl"
              label="Create"
              color="neutral"
              :loading="isCreating"
              class="rounded-full bg-white px-6 font-medium text-dark hover:bg-white/90"
              @click="onCreate"
            />
          </div>
        </div>
      </template>
    </USlideover>

    <USlideover
      v-model:open="isEditOpen"
      side="right"
      inset
      title="EDIT ORGANIZATION"
      :ui="{
        header: 'border-b-2 border-[#232323] px-6 py-6',
        title: 'text-sm font-medium tracking-[1.4px] text-white uppercase',
        body: 'px-6',
      }"
    >
      <template #body>
        <div class="py-2">
          <p class="mb-4 text-sm leading-relaxed text-[#8b8b8b]">
            Changing the slug updates platform URLs that use
            <span class="font-mono text-white/80"
              >/platform/{{ editForm.slug || '…' }}/…</span
            >. Bookmarks and shared links with the old slug will stop working
            until updated.
          </p>
          <div class="flex flex-col gap-4">
            <UFormField label="Name" required :class="formFieldClass">
              <UInput
                v-model="editForm.name"
                placeholder="Organization name"
                class="w-full"
                size="xl"
                :ui="inputUi"
              />
            </UFormField>
            <UFormField label="Slug" required :class="formFieldClass">
              <UInput
                v-model="editForm.slug"
                placeholder="e.g. acme-corp"
                class="w-full"
                size="xl"
                :ui="inputUi"
              />
            </UFormField>
          </div>

          <div
            class="mt-6 flex justify-end gap-2 border-t border-[#232323] pt-6"
          >
            <UButton
              size="xl"
              label="Cancel"
              color="neutral"
              variant="ghost"
              class="rounded-full px-5 text-white hover:bg-[#232323]"
              @click="closeEdit"
            />
            <UButton
              size="xl"
              label="Save"
              color="neutral"
              :loading="isSaving"
              class="rounded-full bg-white px-6 font-medium text-dark hover:bg-white/90"
              @click="onSaveEdit"
            />
          </div>
        </div>
      </template>
    </USlideover>
  </div>
</template>
