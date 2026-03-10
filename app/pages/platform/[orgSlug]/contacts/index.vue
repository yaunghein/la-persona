<script setup lang="ts">
definePageMeta({
  layout: 'platform',
});

import type { DropdownMenuItem, TableColumn } from '@nuxt/ui';
import { useQuery } from '@tanstack/vue-query';

type Contact = {
  id: string;
  name: string;
  role: string;
  company: string;
  phone: string;
  email: string;
  origin: string;
  originTo?: string;
};

type ContactRow = {
  id: string;
  name: string;
  role: string;
  nameRole: string;
  company: string;
  phone: string;
  email: string;
  origin: string;
  originTo?: string;
  actions: string;
};
type ContactExchangeDTO = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  position: string | null;
  company: string | null;
  cardId: string | null;
  cardSlug: string | null;
  cardFirstName: string | null;
  cardLastName: string | null;
};
type ContactsResponse = {
  isOwner: boolean;
  cards: { id: string; label: string }[];
  contacts: ContactExchangeDTO[];
};

const toast = useToast();
const isInfoOpen = ref(false);
const isDeleteConfirmOpen = ref(false);
const isDeletingContact = ref(false);
const selectedContactToDelete = ref<{ id: string; name: string } | null>(null);
const route = useRoute();
const router = useRouter();
const orgSlug = computed(() => String(route.params.orgSlug || ''));
const { data: session } = await authClient.useSession(useFetch);
const hasSeenInfoPopup = useLocalStorage(
  `lp-info-popup:contacts:${session.value?.user.id || 'anonymous'}`,
  false
);

onMounted(() => {
  if (hasSeenInfoPopup.value) return;
  isInfoOpen.value = true;
  hasSeenInfoPopup.value = true;
});

const parseViewMode = (value: unknown): 'list' | 'grid' =>
  value === 'grid' ? 'grid' : 'list';

const parsePage = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
};

const viewMode = ref<'list' | 'grid'>(parseViewMode(route.query.view));
const selectedCardId = ref('all');
const ownerSearchQuery = ref('');

const infoItems = [
  {
    icon: 'i-lucide-eye',
    title: 'View Your Cards',
    description: 'See all your cards in one place.',
  },
  {
    icon: 'i-lucide-chevrons-up',
    title: 'Update Your Cards',
    description: 'Change contact details.',
  },
  {
    icon: 'i-lucide-plus',
    title: 'Create a New Card',
    description:
      'Request a new card with a fresh design or a different purpose.',
  },
  {
    icon: 'i-lucide-share-2',
    title: 'Share Instantly',
    description: 'Access your card link or QR code whenever you need it.',
  },
];
const {
  data: contactsResponse,
  isLoading: isContactsLoading,
  refetch: refetchContacts,
} =
  useQuery<ContactsResponse>({
    queryKey: ['contact-exchange', () => selectedCardId.value],
    queryFn: async () =>
      $fetch('/api/contact-exchange', {
        query: {
          cardId: selectedCardId.value,
        },
      }),
  });
const isOwner = computed(() => contactsResponse.value?.isOwner === true);
const ownerCardItems = computed(() => [
  { id: 'all', label: 'All Cards' },
  ...(contactsResponse.value?.cards || []),
]);
const contactsData = computed(() => contactsResponse.value?.contacts || []);
const filteredContactsData = computed(() => {
  const query = ownerSearchQuery.value.trim().toLowerCase();
  if (!isOwner.value || !query) return contactsData.value;

  return contactsData.value.filter((item) => {
    const cardName = [item.cardFirstName, item.cardLastName]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return [
      item.name,
      item.phone,
      item.email || '',
      item.company || '',
      item.position || '',
      cardName,
    ].some((value) => value.toLowerCase().includes(query));
  });
});
const contacts = computed<ContactRow[]>(() =>
  filteredContactsData.value.map((item) => {
    const role = item.position?.trim() || 'No role';
    const sourceCardName = [item.cardFirstName, item.cardLastName]
      .filter(Boolean)
      .join(' ')
      .trim();
    const originLabel =
      item.cardId && sourceCardName
        ? `From ${sourceCardName}`
        : item.cardId
          ? 'From Card Exchange'
          : 'Added Manually';
    const originTo =
      item.cardId && item.cardSlug
        ? `/platform/${orgSlug.value}/cards/${item.cardSlug}`
        : undefined;
    return {
      id: item.id,
      name: item.name,
      role,
      nameRole: `${item.name}\n${role}`,
      company: item.company || 'N/A',
      phone: item.phone || 'N/A',
      email: item.email || 'N/A',
      origin: originLabel,
      originTo,
      actions: '⋮',
    };
  })
);

const page = ref(parsePage(route.query.page));
const listItemsPerPage = 10;
const gridItemsPerPage = 6;
const itemsPerPage = computed(() =>
  viewMode.value === 'grid' ? gridItemsPerPage : listItemsPerPage
);

const total = computed(() => contacts.value.length);
const hasContacts = computed(() => total.value > 0);
const isSearchEmptyState = computed(
  () =>
    isOwner.value &&
    ownerSearchQuery.value.trim().length > 0 &&
    !hasContacts.value
);
const maxPage = computed(() =>
  Math.max(1, Math.ceil(total.value / itemsPerPage.value))
);

const pagedContacts = computed(() => {
  const start = (page.value - 1) * itemsPerPage.value;
  return contacts.value.slice(start, start + itemsPerPage.value);
});

const gridContacts = computed<Contact[]>(() =>
  pagedContacts.value.map((contact, index) => ({
    id: contact.id,
    name: contact.name,
    role: contact.role,
    company: index % 3 === 0 ? 'N/A' : contact.company,
    phone: contact.phone,
    email: contact.email,
    origin: contact.origin,
    originTo: contact.originTo,
  }))
);

const onCreateContact = () => {
  navigateTo(`/platform/${orgSlug.value}/contacts/add`);
};

const onExport = () => {
  toast.add({
    title: 'Export started',
    description: 'Sample export action triggered.',
    color: 'success',
  });
};

function openDeleteConfirm(contact: { id: string; name: string }) {
  selectedContactToDelete.value = contact;
  isDeleteConfirmOpen.value = true;
}

function closeDeleteConfirm() {
  isDeleteConfirmOpen.value = false;
  selectedContactToDelete.value = null;
}

async function onConfirmDelete() {
  if (!selectedContactToDelete.value) return;

  isDeletingContact.value = true;
  try {
    await $fetch(`/api/contact-exchange/${selectedContactToDelete.value.id}`, {
      method: 'DELETE',
    });
    await refetchContacts();
    toast.add({
      title: 'Contact deleted',
      description: `"${selectedContactToDelete.value.name}" was removed.`,
      color: 'success',
    });
    closeDeleteConfirm();
  } catch (error: any) {
    toast.add({
      title: 'Delete failed',
      description:
        error?.data?.statusMessage || error?.statusMessage || 'Please try again.',
      color: 'error',
    });
  } finally {
    isDeletingContact.value = false;
  }
}

function getActionItems(contact: { id: string; name: string }): DropdownMenuItem[][] {
  return [
    [
      {
        label: 'Delete Contact',
        icon: 'i-lucide-trash-2',
        color: 'error',
        onSelect: () => openDeleteConfirm(contact),
      },
    ],
  ];
}

const setViewMode = (mode: 'list' | 'grid') => {
  if (viewMode.value !== mode) {
    viewMode.value = mode;
    page.value = 1;
  }
};

watch(
  () => route.query,
  (query) => {
    const nextView = parseViewMode(query.view);
    const nextPage = parsePage(query.page);
    if (viewMode.value !== nextView) viewMode.value = nextView;
    if (page.value !== nextPage) page.value = nextPage;
  }
);

watch([selectedCardId, ownerSearchQuery], () => {
  page.value = 1;
});

watch([viewMode, page, maxPage], async () => {
  if (page.value > maxPage.value) {
    page.value = maxPage.value;
    return;
  }

  const nextView = viewMode.value;
  const nextPage = String(page.value);
  const currentView = parseViewMode(route.query.view);
  const currentPage = String(parsePage(route.query.page));

  if (currentView === nextView && currentPage === nextPage) return;

  await router.replace({
    query: {
      ...route.query,
      view: nextView,
      page: nextPage,
    },
  });
});

const columns: TableColumn<ContactRow>[] = [
  {
    accessorKey: 'nameRole',
    header: 'NAME',
    meta: {
      class: {
        th: 'text-sm font-medium uppercase tracking-widest text-white',
        td: 'text-sm font-medium leading-[1.35]',
      },
    },
  },
  {
    accessorKey: 'company',
    header: 'COMPANY',
    meta: {
      class: {
        th: 'text-sm font-medium uppercase tracking-widest text-white',
        td: 'text-sm font-medium text-muted',
      },
    },
  },
  {
    accessorKey: 'phone',
    header: 'PHONE NUMBER',
    meta: {
      class: {
        th: 'text-sm font-medium uppercase tracking-widest text-white',
        td: 'text-sm font-medium text-muted',
      },
    },
  },
  {
    accessorKey: 'email',
    header: 'EMAIL',
    meta: {
      class: {
        th: 'text-sm font-medium uppercase tracking-widest text-white',
        td: 'text-sm font-medium text-muted',
      },
    },
  },
  {
    accessorKey: 'origin',
    header: 'ORIGIN',
    meta: {
      class: {
        th: 'text-sm font-medium uppercase tracking-widest text-white',
        td: 'text-sm font-medium text-muted',
      },
    },
  },
  {
    id: 'actions',
    accessorKey: 'actions',
    header: '',
    meta: {
      class: {
        th: 'w-10',
        td: 'text-right text-muted text-base',
      },
    },
  },
];
const visibleColumns = computed(() =>
  isOwner.value
    ? columns
    : columns.filter((column) => {
        if (!('accessorKey' in column)) return true;
        return column.accessorKey !== 'origin';
      })
);
</script>

<template>
  <div class="flex min-h-[calc(100dvh-7rem)] flex-col gap-8">
    <div class="flex flex-wrap items-center justify-between gap-4 pb-5">
      <div class="flex items-center gap-2">
        <h1
          class="text-[1.75rem] font-normal leading-tight tracking-widest uppercase"
        >
          People you've connected with
        </h1>
        <UButton
          icon="material-symbols:info-outline"
          color="neutral"
          variant="ghost"
          class="size-6 flex items-center justify-center rounded-full p-0 text-muted hover:bg-[#232323] cursor-pointer"
          aria-label="Open contacts information"
          @click="isInfoOpen = true"
        />
      </div>

      <div class="flex items-center gap-2">
        <UInput
          v-if="isOwner"
          v-model="ownerSearchQuery"
          placeholder="Search contacts..."
          icon="i-lucide-search"
          class="w-64 hidden"
          :ui="{
            base: 'h-9 rounded-full border-[#232323] bg-[#171717] px-3 text-white placeholder:text-muted',
          }"
        />
        <USelectMenu
          v-if="isOwner"
          v-model="selectedCardId"
          value-key="id"
          :items="ownerCardItems"
          :search-input="false"
          class="w-48 hidden"
          :ui="{
            base: 'h-9 rounded-full border-[#232323] bg-[#171717] px-3 text-white',
            content: 'border border-[#2a2a2a] bg-[#171717]',
            item: 'text-white data-[highlighted]:bg-[#232323]',
            value: 'text-white',
          }"
        />
        <UButton
          label="Create New Contact"
          leading-icon="i-material-symbols-add"
          color="neutral"
          class="h-9 rounded-full bg-white px-5 font-medium text-dark hover:bg-white/90 active:hover:bg-white/80"
          @click="onCreateContact"
        />

        <UButton
          icon="i-material-symbols-download-sharp"
          color="neutral"
          variant="ghost"
          class="w-16 h-9 flex items-center justify-center rounded-full border-2 border-[#232323] bg-[#232323] p-0 text-white hover:bg-[#2a2a2a] mr-8"
          @click="onExport"
        />

        <UFieldGroup>
          <UButton
            icon="i-lucide-table-2"
            class="size-8 rounded-l-md border-2 border-[#232323] p-0 flex items-center justify-center"
            aria-label="List view"
            @click="setViewMode('list')"
            :variant="viewMode === 'list' ? 'solid' : 'ghost'"
            :class="
              viewMode === 'list' ? 'bg-[#232323] text-white' : 'text-muted'
            "
          />
          <UButton
            icon="i-lucide-layout-grid"
            class="size-8 rounded-r-md border-2 border-[#232323] p-0 flex items-center justify-center"
            aria-label="Grid view"
            @click="setViewMode('grid')"
            :variant="viewMode === 'grid' ? 'solid' : 'ghost'"
            :class="
              viewMode === 'grid' ? 'bg-[#232323] text-white' : 'text-muted'
            "
          />
        </UFieldGroup>
      </div>
    </div>

    <div v-if="isContactsLoading" class="flex-1 space-y-3">
      <USkeleton
        v-for="index in 6"
        :key="index"
        class="h-16 w-full rounded-md"
      />
    </div>

    <div
      v-else-if="isSearchEmptyState"
      class="flex flex-1 flex-col items-center justify-center gap-4"
    >
      <UIcon name="i-lucide-search-x" class="size-8 text-muted" />
      <h2 class="text-base font-medium uppercase tracking-widest text-white">
        No matching contacts
      </h2>
      <p class="max-w-52 text-center text-sm text-muted">
        No contacts match your search. Try another keyword.
      </p>
      <UButton
        label="Clear Search"
        color="neutral"
        class="mt-2 rounded-full bg-white px-5 font-medium text-dark hover:bg-white/90"
        @click="ownerSearchQuery = ''"
      />
    </div>

    <div
      v-else-if="!hasContacts"
      class="flex flex-1 flex-col items-center justify-center gap-4"
    >
      <UIcon
        name="i-material-symbols:perm-contact-calendar-sharp"
        class="size-8 text-muted"
      />
      <h2 class="text-base font-medium uppercase tracking-widest text-white">
        No contacts yet
      </h2>
      <p class="max-w-[20rem] text-center text-sm text-muted">
        Once people exchange contacts with your card, they will appear here.
      </p>
      <UButton
        label="Create New Contact"
        leading-icon="i-material-symbols-add"
        color="neutral"
        class="mt-2 rounded-full bg-white px-5 font-medium text-dark hover:bg-white/90"
        @click="onCreateContact"
      />
    </div>

    <div
      v-else-if="viewMode === 'list'"
      class="hide-scrollbar flex-1 overflow-x-auto overflow-y-hidden"
    >
      <UTable
        :data="pagedContacts"
        :columns="visibleColumns"
        :ui="{
          th: 'px-4 py-4 border-b border-[#232323]',
          td: 'px-4 py-4 border-b border-[#232323]',
          tr: 'bg-transparent',
          empty: 'py-16 text-center text-sm text-muted',
        }"
        class="w-full min-w-[1000px]"
      >
        <template #nameRole-cell="{ row }">
          <div class="leading-[1.35]">
            <p class="text-sm font-medium text-white">
              {{ row.original.name }}
            </p>
            <p class="text-sm font-medium text-muted">
              {{ row.original.role }}
            </p>
          </div>
        </template>
        <template v-if="isOwner" #origin-cell="{ row }">
          <UButton
            v-if="row.original.originTo"
            :to="row.original.originTo"
            color="neutral"
            variant="link"
            class="h-auto p-0 text-sm font-medium text-muted"
          >
            <UIcon name="i-lucide-external-link" class="ml-1 size-4" />
            <span>{{ row.original.origin }}</span>
          </UButton>
          <span v-else class="text-sm font-medium text-muted">
            {{ row.original.origin }}
          </span>
        </template>
        <template #actions-cell="{ row }">
          <UDropdownMenu :items="getActionItems(row.original)">
            <UButton
              icon="i-mdi-dots-vertical"
              color="neutral"
              variant="ghost"
              class="text-muted"
            />
          </UDropdownMenu>
        </template>
      </UTable>
    </div>

    <div v-else class="flex-1">
      <div class="mb-5 flex items-center gap-1 text-sm text-muted">
        <span>Name</span>
        <UIcon name="i-lucide-arrow-down-narrow-wide" class="size-4" />
      </div>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <UCard
          v-for="contact in gridContacts"
          :key="contact.id"
          :ui="{
            root: 'rounded-[8px] bg-[#171717] border border-transparent',
            body: 'p-4',
            footer: 'border-t border-[#232323] p-4',
          }"
        >
          <div class="space-y-1">
            <p class="text-[20px] font-medium leading-[20px] text-white">
              {{ contact.name }}
            </p>
            <p class="text-sm text-muted">{{ contact.role }}</p>
          </div>

          <div class="mt-10 space-y-2 text-sm text-muted">
            <p>{{ contact.phone }}</p>
            <p>{{ contact.email }}</p>
            <p>{{ contact.company }}</p>
          </div>

          <template #footer>
            <div
              class="flex items-end"
              :class="isOwner ? 'justify-between' : 'justify-end'"
            >
              <div v-if="isOwner">
                <p class="text-xs text-muted">Origin</p>
                <UButton
                  v-if="contact.originTo"
                  :to="contact.originTo"
                  color="neutral"
                  variant="link"
                  class="mt-1 h-auto p-0 text-sm text-white underline underline-offset-2"
                >
                  {{ contact.origin }}
                </UButton>
                <p v-else class="text-sm text-white">{{ contact.origin }}</p>
              </div>

              <UDropdownMenu :items="getActionItems(contact)">
                <UButton
                  icon="i-mdi-dots-vertical"
                  color="neutral"
                  variant="ghost"
                  class="text-muted"
                />
              </UDropdownMenu>
            </div>
          </template>
        </UCard>
      </div>
    </div>

    <div v-if="hasContacts" class="mt-auto flex items-center justify-end pt-4">
      <UPagination
        v-model:page="page"
        :total="total"
        :items-per-page="itemsPerPage"
        show-controls
        show-edges
        color="neutral"
        variant="outline"
        active-color="neutral"
        active-variant="solid"
        first-icon="i-lucide-chevrons-left"
        prev-icon="i-lucide-chevron-left"
        next-icon="i-lucide-chevron-right"
        last-icon="i-lucide-chevrons-right"
      />
    </div>
  </div>

  <UModal
    v-model:open="isInfoOpen"
    :close="false"
    :ui="{
      content:
        'max-w-[480px] rounded-[8px] border border-[#232323] bg-[#171717]',
      body: 'p-0',
    }"
  >
    <template #content>
      <div class="overflow-hidden rounded-[8px] bg-[#171717]">
        <div
          class="flex items-center justify-between border-b-2 border-[#232323] px-6 pb-[26px] pt-6"
        >
          <h2 class="text-sm font-medium uppercase tracking-widest text-white">
            What is cards?
          </h2>
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            class="size-6 flex items-center justify-center rounded-full p-0 text-white hover:bg-[#232323]"
            aria-label="Close info"
            @click="isInfoOpen = false"
          />
        </div>

        <div class="p-6">
          <div class="space-y-8">
            <div class="space-y-4">
              <h3
                class="text-[20px] font-medium leading-[27px] uppercase tracking-widest text-white"
              >
                Your cards, all in one place
              </h3>
              <p class="text-sm leading-[21px] text-muted">
                Manage every version of your presence.
              </p>
            </div>

            <div class="space-y-0">
              <div
                v-for="(item, index) in infoItems"
                :key="item.title"
                class="px-4 py-3"
                :class="
                  index < infoItems.length - 1
                    ? 'border-b border-[#2a2a2a]'
                    : ''
                "
              >
                <div class="flex items-start gap-2">
                  <UIcon :name="item.icon" class="mt-0.5 size-5 text-white" />
                  <div>
                    <p class="text-[14px] text-white">{{ item.title }}</p>
                    <p class="mt-2 text-[14px] text-muted">
                      {{ item.description }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div class="flex justify-end">
              <UButton
                label="Understood"
                color="neutral"
                class="rounded-full bg-white px-6 text-dark hover:bg-white/90"
                @click="isInfoOpen = false"
              />
            </div>
          </div>
        </div>
      </div>
    </template>
  </UModal>

  <UModal
    v-model:open="isDeleteConfirmOpen"
    :close="false"
    :dismissible="!isDeletingContact"
    :ui="{
      content: 'bg-[#171717] max-w-md',
      title: 'text-white',
      body: 'pt-4',
      footer: 'justify-end gap-2',
    }"
    title="Delete Contact?"
  >
    <template #body>
      <p class="text-sm leading-relaxed text-[#bcbcbc]">
        This action cannot be undone. The contact
        <span class="font-medium text-white">
          "{{ selectedContactToDelete?.name }}"
        </span>
        will be removed.
      </p>
    </template>
    <template #footer>
      <UButton
        label="Cancel"
        color="neutral"
        variant="ghost"
        :disabled="isDeletingContact"
        @click="closeDeleteConfirm"
      />
      <UButton
        label="Delete"
        color="error"
        :loading="isDeletingContact"
        @click="onConfirmDelete"
      />
    </template>
  </UModal>
</template>
