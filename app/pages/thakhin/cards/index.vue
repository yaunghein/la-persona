<script setup lang="ts">
definePageMeta({
  layout: 'thakhin',
});

import type { DropdownMenuItem, TableColumn } from '@nuxt/ui';

type CardRow = {
  id: string;
  slug: string;
  firstName: string;
  lastName: string | null;
  position: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  splineUrl: string | null;
  avatarUrl: string | null;
  wallpaperUrl: string | null;
  cardBackUrl: string | null;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  userId: string | null;
  linkedUserEmail: string | null;
  createdAt: string;
  updatedAt: string;
};

type OrgOption = { id: string; name: string; slug: string };

const toast = useToast();

const isFormOpen = ref(false);
const editingId = ref<string | null>(null);
const isSaving = ref(false);
const isDeleteOpen = ref(false);
const isDeleting = ref(false);
const cardToDelete = ref<CardRow | null>(null);

const form = reactive({
  organizationId: '',
  firstName: '',
  lastName: '',
  position: '',
  company: '',
  phone: '',
  email: '',
  website: '',
  splineUrl: '',
  avatarUrl: '',
  wallpaperUrl: '',
  cardBackUrl: '',
});

function resetForm() {
  form.organizationId = '';
  form.firstName = '';
  form.lastName = '';
  form.position = '';
  form.company = '';
  form.phone = '';
  form.email = '';
  form.website = '';
  form.splineUrl = '';
  form.avatarUrl = '';
  form.wallpaperUrl = '';
  form.cardBackUrl = '';
}

function fillForm(row: CardRow) {
  form.organizationId = row.organizationId;
  form.firstName = row.firstName;
  form.lastName = row.lastName || '';
  form.position = row.position;
  form.company = row.company || '';
  form.phone = row.phone || '';
  form.email = row.email || '';
  form.website = row.website || '';
  form.splineUrl = row.splineUrl || '';
  form.avatarUrl = row.avatarUrl || '';
  form.wallpaperUrl = row.wallpaperUrl || '';
  form.cardBackUrl = row.cardBackUrl || '';
}

function openCreate() {
  editingId.value = null;
  resetForm();
  isFormOpen.value = true;
}

function openEdit(row: CardRow) {
  editingId.value = row.id;
  fillForm(row);
  isFormOpen.value = true;
}

function openDelete(row: CardRow) {
  cardToDelete.value = row;
  isDeleteOpen.value = true;
}

function closeDelete() {
  isDeleteOpen.value = false;
  cardToDelete.value = null;
}

const {
  data: cardsData,
  pending,
  refresh,
} = await useFetch<CardRow[]>('/api/cards/admin');
const { data: orgOptions } = await useFetch<OrgOption[]>(
  '/api/cards/admin/options'
);

const rows = computed(() => cardsData.value || []);
const orgSelectItems = computed(() =>
  (orgOptions.value || []).map((o) => ({ label: o.name, value: o.id }))
);

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

function displayName(row: CardRow) {
  return `${row.firstName} ${row.lastName || ''}`.trim();
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

const slideTitle = computed(() =>
  editingId.value ? 'EDIT CARD' : 'CREATE CARD'
);

async function onSubmitForm() {
  if (!form.firstName.trim() || !form.position.trim()) {
    toast.add({
      title: 'Missing fields',
      description: 'First name and position are required.',
      color: 'warning',
    });
    return;
  }
  isSaving.value = true;
  try {
    const body: Record<string, unknown> = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim() || null,
      position: form.position.trim(),
      company: form.company.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      website: form.website.trim() || null,
      splineUrl: form.splineUrl.trim() || null,
      avatarUrl: form.avatarUrl.trim() || null,
      wallpaperUrl: form.wallpaperUrl.trim() || null,
      cardBackUrl: form.cardBackUrl.trim() || null,
    };

    if (!editingId.value) {
      await $fetch('/api/cards/admin', { method: 'POST', body });
      toast.add({
        title: 'Card created',
        description: 'Unclaimed card is ready for onboarding invitation.',
        color: 'success',
      });
    } else {
      body.organizationId = form.organizationId;
      await $fetch(`/api/cards/admin/${editingId.value}`, {
        method: 'PATCH',
        body,
      });
      toast.add({
        title: 'Card updated',
        color: 'success',
      });
    }

    await refresh();
    isFormOpen.value = false;
    editingId.value = null;
    resetForm();
  } catch (error: any) {
    toast.add({
      title: editingId.value ? 'Update failed' : 'Create failed',
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

async function onConfirmDelete() {
  if (!cardToDelete.value) return;
  isDeleting.value = true;
  try {
    await $fetch(`/api/cards/admin/${cardToDelete.value.id}`, {
      method: 'DELETE',
    });
    await refresh();
    toast.add({
      title: 'Card deleted',
      description: `"${displayName(cardToDelete.value)}" was removed.`,
      color: 'success',
    });
    closeDelete();
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

function getActionItems(row: CardRow): DropdownMenuItem[][] {
  return [
    [
      {
        label: 'Edit',
        icon: 'i-lucide-pencil',
        onSelect: () => openEdit(row),
      },
      {
        label: 'Delete',
        icon: 'i-lucide-trash-2',
        color: 'error',
        onSelect: () => openDelete(row),
      },
    ],
  ];
}

const columns: TableColumn<CardRow>[] = [
  { id: 'displayName', header: 'NAME' },
  { accessorKey: 'slug', header: 'SLUG' },
  { accessorKey: 'organizationName', header: 'ORGANIZATION' },
  { accessorKey: 'position', header: 'ROLE' },
  { id: 'claimStatus', header: 'USER' },
  { accessorKey: 'email', header: 'CARD EMAIL' },
  { accessorKey: 'createdAt', header: 'CREATED' },
  { id: 'actions', header: '' },
];

/** Matches `app/components/form/manual-contact.vue` / `update-card-info.vue` */
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
</script>

<template>
  <div class="flex min-h-[calc(100dvh-11rem)] flex-col gap-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1
        class="text-[1.75rem] font-normal leading-tight tracking-widest uppercase"
      >
        Cards
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
          label="Create Card"
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
        class="w-full min-w-[1100px]"
      >
        <template #displayName-cell="{ row }">
          <span class="font-medium text-white">
            {{ displayName(row.original) }}
          </span>
        </template>
        <template #claimStatus-cell="{ row }">
          <UBadge
            v-if="row.original.userId"
            color="success"
            variant="soft"
            class="uppercase"
          >
            Linked
          </UBadge>
          <UBadge v-else color="warning" variant="soft" class="uppercase">
            Unclaimed
          </UBadge>
          <p
            v-if="row.original.linkedUserEmail"
            class="mt-1 max-w-48 truncate text-xs text-muted"
          >
            {{ row.original.linkedUserEmail }}
          </p>
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
      v-model:open="isFormOpen"
      side="right"
      inset
      :title="slideTitle"
      :ui="{
        header: 'border-b-2 border-[#232323] px-6 py-6',
        title: 'text-sm font-medium tracking-[1.4px] text-white uppercase',
        body: 'px-6',
      }"
    >
      <template #body>
        <div class="py-2">
          <div class="flex flex-col gap-4">
            <UFormField
              v-if="editingId"
              label="Organization"
              required
              :class="formFieldClass"
            >
              <USelect
                v-model="form.organizationId"
                :items="orgSelectItems"
                placeholder="Select organization"
                size="xl"
                class="w-full"
                :ui="selectUi"
              />
            </UFormField>

            <UFormField label="First name" required :class="formFieldClass">
              <UInput
                v-model="form.firstName"
                placeholder="First name"
                class="w-full"
                size="xl"
                :ui="inputUi"
              />
            </UFormField>
            <UFormField label="Last name" :class="formFieldClass">
              <UInput
                v-model="form.lastName"
                placeholder="Last name (optional)"
                class="w-full"
                size="xl"
                :ui="inputUi"
              />
            </UFormField>
            <UFormField
              label="Position / role"
              required
              :class="formFieldClass"
            >
              <UInput
                v-model="form.position"
                placeholder="e.g. Designer"
                class="w-full"
                size="xl"
                :ui="inputUi"
              />
            </UFormField>
            <UFormField label="Company" :class="formFieldClass">
              <UInput
                v-model="form.company"
                placeholder="Company / brand"
                class="w-full"
                size="xl"
                :ui="inputUi"
              />
            </UFormField>
            <UFormField label="Phone" :class="formFieldClass">
              <UInput
                v-model="form.phone"
                placeholder="Phone number"
                class="w-full"
                size="xl"
                :ui="inputUi"
              />
            </UFormField>
            <UFormField label="Card email" :class="formFieldClass">
              <UInput
                v-model="form.email"
                type="email"
                placeholder="Shown on card (optional)"
                class="w-full"
                size="xl"
                :ui="inputUi"
              />
            </UFormField>
            <UFormField label="Website" :class="formFieldClass">
              <UInput
                v-model="form.website"
                placeholder="https://..."
                class="w-full"
                size="xl"
                :ui="inputUi"
              />
            </UFormField>
            <UFormField label="Spline URL" :class="formFieldClass">
              <UInput
                v-model="form.splineUrl"
                placeholder="https://..."
                class="w-full"
                size="xl"
                :ui="inputUi"
              />
            </UFormField>
            <UFormField label="Avatar URL" :class="formFieldClass">
              <UInput
                v-model="form.avatarUrl"
                placeholder="https://..."
                class="w-full"
                size="xl"
                :ui="inputUi"
              />
            </UFormField>
            <UFormField label="Wallpaper URL" :class="formFieldClass">
              <UInput
                v-model="form.wallpaperUrl"
                placeholder="https://..."
                class="w-full"
                size="xl"
                :ui="inputUi"
              />
            </UFormField>
            <UFormField label="Card back URL" :class="formFieldClass">
              <UInput
                v-model="form.cardBackUrl"
                placeholder="https://..."
                class="w-full"
                size="xl"
                :ui="inputUi"
              />
            </UFormField>
          </div>

          <p v-if="!editingId" class="mt-1 text-xs text-[#8b8b8b]">
            New cards are stored under the placeholder org until you create an
            onboarding invitation (which creates the customer org and moves the
            card). User stays unlinked until the recipient accepts.
          </p>

          <div
            class="mt-6 flex justify-end gap-2 border-t border-[#232323] pt-6"
          >
            <UButton
              size="xl"
              label="Cancel"
              color="neutral"
              variant="ghost"
              class="rounded-full px-5 text-white hover:bg-[#232323]"
              @click="isFormOpen = false"
            />
            <UButton
              size="xl"
              :label="editingId ? 'Save changes' : 'Create card'"
              color="neutral"
              :loading="isSaving"
              class="rounded-full bg-white px-6 font-medium text-dark hover:bg-white/90"
              @click="onSubmitForm"
            />
          </div>
        </div>
      </template>
    </USlideover>

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
      title="Delete card?"
    >
      <template #body>
        <p class="text-sm leading-relaxed text-[#bcbcbc]">
          This cannot be undone. The card
          <span class="font-medium text-white">
            "{{ cardToDelete ? displayName(cardToDelete) : '' }}"
          </span>
          and related subscription rows will be removed.
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
          :loading="isDeleting"
          class="rounded-full px-6 font-medium"
          @click="onConfirmDelete"
        />
      </template>
    </UModal>
  </div>
</template>
