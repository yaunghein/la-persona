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
  isLaPersonaContact: boolean;
  personaCardTo?: string;
};
type ContactActionItem = {
  id: string;
  name: string;
  role: string;
  company: string;
  phone: string;
  email: string;
  personaCardTo?: string;
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
  isLaPersonaContact: boolean;
  personaCardTo?: string;
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
  source: string;
  laPersonaUserId: string | null;
  laPersonaCardId: string | null;
  laPersonaCardSlug: string | null;
  reciprocalExchangeId: string | null;
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
const isCreateContactSlideoverOpen = ref(false);
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
    icon: 'i-lucide-users',
    title: 'Track Every Connection',
    description:
      'See everyone who exchanged details with your persona cards in one organized list.',
  },
  {
    icon: 'i-lucide-user-plus',
    title: 'Add Contacts Manually',
    description:
      'Create a contact anytime, even when the exchange happened outside your persona card flow.',
  },
  {
    icon: 'i-lucide-download',
    title: 'Export for Follow-ups',
    description:
      'Download your current contacts view as CSV for outreach, reports, or team sharing.',
  },
  {
    icon: 'i-lucide-save',
    title: 'Save Contact',
    description: 'Save any contact to your phone.',
  },
];
const {
  data: contactsResponse,
  isLoading: isContactsLoading,
  refetch: refetchContacts,
} = useQuery<ContactsResponse>({
  queryKey: ['contact-exchange', () => selectedCardId.value],
  queryFn: async () =>
    $fetch<ContactsResponse>('/api/contact-exchange', {
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
    const isLaPersonaContact = item.source === 'seamless_exchange';
    const personaCardTo =
      isLaPersonaContact && item.laPersonaCardSlug
        ? `/c/${item.laPersonaCardSlug}`
        : undefined;
    const originLabel = isLaPersonaContact
      ? 'Seamless Exchange'
      : item.cardId && sourceCardName
        ? `From ${sourceCardName}`
        : item.cardId
          ? 'From Card Exchange'
          : 'Added Manually';
    const originTo =
      !isLaPersonaContact && item.cardId && item.cardSlug
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
      isLaPersonaContact,
      personaCardTo,
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
    isLaPersonaContact: contact.isLaPersonaContact,
    personaCardTo: contact.personaCardTo,
  }))
);

const onCreateContact = () => {
  isCreateContactSlideoverOpen.value = true;
};

function escapeCsvCell(value: string) {
  const safeValue = String(value ?? '')
    .replace(/\r?\n/g, ' ')
    .trim();
  return `"${safeValue.replace(/"/g, '""')}"`;
}

const onExport = () => {
  if (!contacts.value.length) {
    toast.add({
      title: 'Nothing to export',
      description: 'No contacts available in the current table.',
      color: 'warning',
    });
    return;
  }

  const headers = isOwner.value
    ? ['Name', 'Role', 'Company', 'Phone', 'Email', 'Origin']
    : ['Name', 'Role', 'Company', 'Phone', 'Email'];

  const rows = contacts.value.map((contact) =>
    isOwner.value
      ? [
          contact.name,
          normalizeContactField(contact.role),
          normalizeContactField(contact.company),
          normalizeContactField(contact.phone),
          normalizeContactField(contact.email),
          normalizeContactField(contact.origin),
        ]
      : [
          contact.name,
          normalizeContactField(contact.role),
          normalizeContactField(contact.company),
          normalizeContactField(contact.phone),
          normalizeContactField(contact.email),
        ]
  );

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => escapeCsvCell(cell)).join(','))
    .join('\r\n');

  const blob = new Blob([`\uFEFF${csvContent}`], {
    type: 'text/csv;charset=utf-8;',
  });
  const fileName = `contacts-${orgSlug.value || 'org'}-${new Date().toISOString().slice(0, 10)}.csv`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  // toast.add({
  //   title: 'Export complete',
  //   description: `${contacts.value.length} contact(s) downloaded as CSV.`,
  //   color: 'success',
  // });
};

function normalizeContactField(value: string) {
  const normalized = String(value || '').trim();
  return !normalized || normalized.toUpperCase() === 'N/A' ? '' : normalized;
}

function escapeVcfValue(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function splitName(fullName: string) {
  const normalized = normalizeContactField(fullName);
  if (!normalized) return { firstName: '', lastName: '' };

  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return { firstName: parts[0] || '', lastName: '' };

  return {
    firstName: parts.slice(0, -1).join(' '),
    lastName: parts[parts.length - 1] || '',
  };
}

function createVcfContent(contact: ContactActionItem) {
  const fullName = normalizeContactField(contact.name);
  const phone = normalizeContactField(contact.phone);
  const email = normalizeContactField(contact.email);
  const title = normalizeContactField(contact.role);
  const org = normalizeContactField(contact.company);
  const { firstName, lastName } = splitName(fullName);

  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN;CHARSET=UTF-8:${escapeVcfValue(fullName)}`,
    `N;CHARSET=UTF-8:${escapeVcfValue(lastName)};${escapeVcfValue(firstName)};;;`,
    phone ? `TEL;TYPE=CELL:${escapeVcfValue(phone)}` : '',
    email ? `EMAIL;CHARSET=UTF-8;TYPE=INTERNET:${escapeVcfValue(email)}` : '',
    title ? `TITLE;CHARSET=UTF-8:${escapeVcfValue(title)}` : '',
    org ? `ORG;CHARSET=UTF-8:${escapeVcfValue(org)}` : '',
    `REV:${new Date().toISOString()}`,
    'END:VCARD',
  ].filter(Boolean);

  return `${lines.join('\r\n')}\r\n`;
}

function sanitizeVcfFilename(value: string) {
  return (
    normalizeContactField(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'contact'
  );
}

function saveContactAsVcf(contact: ContactActionItem) {
  const content = createVcfContent(contact);
  const fileName = `${sanitizeVcfFilename(contact.name)}.vcf`;
  const blob = new Blob([content], { type: 'text/vcard;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);

  // toast.add({
  //   title: 'Contact saved',
  //   description: `${contact.name} downloaded as VCF.`,
  //   color: 'success',
  // });
}

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
        error?.data?.statusMessage ||
        error?.statusMessage ||
        'Please try again.',
      color: 'error',
    });
  } finally {
    isDeletingContact.value = false;
  }
}

function getActionItems(contact: ContactActionItem): DropdownMenuItem[][] {
  const personaCardActions: DropdownMenuItem[] = contact.personaCardTo
    ? [
        {
          label: 'View PERSONA Card',
          icon: 'i-lucide-external-link',
          onSelect: () => navigateTo(contact.personaCardTo),
        },
      ]
    : [];

  return [
    [
      {
        label: 'Save Contact',
        icon: 'i-lucide-download',
        onSelect: () => saveContactAsVcf(contact),
      },
      ...personaCardActions,
    ],
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

const toggleViewMode = () => {
  setViewMode(viewMode.value === 'list' ? 'grid' : 'list');
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
  <div
    class="flex flex-col gap-5 sm:gap-8 pb-20 sm:pb-0"
    :class="!hasContacts && 'min-h-[calc(100dvh-7rem)]'"
  >
    <div
      class="flex flex-col gap-3 sm:pb-0 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="flex items-center gap-2">
        <h1
          class="text-2xl font-medium leading-tight tracking-widest uppercase"
        >
          People you've connected with
        </h1>
        <UButton
          size="lg"
          icon="material-symbols:info-outline"
          color="neutral"
          variant="ghost"
          class="flex items-center justify-center rounded-full p-0 text-muted hover:bg-[#232323] cursor-pointer"
          aria-label="Open contacts information"
          @click="
            () => {
              isInfoOpen = true;
            }
          "
        />
      </div>

      <div class="flex items-center gap-2 sm:hidden fixed top-3.75 right-4">
        <UButton
          icon="material-symbols:list-alt-outline-sharp"
          color="neutral"
          variant="ghost"
          class="flex items-center justify-center cursor-pointer text-muted"
          @click="toggleViewMode"
        />
        <UButton
          v-if="hasContacts"
          icon="material-symbols:download-sharp"
          color="neutral"
          variant="ghost"
          class="flex items-center justify-center cursor-pointer text-muted"
          @click="onExport"
        />
      </div>

      <div
        class="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap"
      >
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
            base: 'h-10 rounded-full border-[#232323] bg-[#171717] px-3 text-white',
            content: 'border border-[#2a2a2a] bg-[#171717]',
            item: 'text-white data-[highlighted]:bg-[#232323]',
            value: 'text-white',
          }"
        />
        <UButton
          v-if="hasContacts"
          label="Create New Contact"
          leading-icon="i-material-symbols-add"
          color="neutral"
          class="fixed z-20 bottom-5 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:static h-10 cursor-pointer flex items-center justify-center rounded-full border-2 border-[#232323] bg-white px-5 font-medium text-dark hover:bg-white/90 active:hover:bg-white/80"
          @click="onCreateContact"
        />

        <UButton
          icon="i-material-symbols-download-sharp"
          color="neutral"
          variant="ghost"
          class="hidden h-10 w-16 cursor-pointer sm:flex px-5 items-center justify-center rounded-full border-2 border-[#232323] bg-[#232323] p-0 text-white hover:bg-[#2a2a2a]"
          @click="onExport"
        />

        <UFieldGroup class="hidden sm:flex">
          <UButton
            icon="i-lucide-table-2"
            class="cursor-pointer size-9 rounded-l-md border-2 border-[#232323] hover:bg-[#232323] p-0 flex items-center justify-center"
            aria-label="List view"
            @click="setViewMode('list')"
            :variant="viewMode === 'list' ? 'solid' : 'ghost'"
            :class="
              viewMode === 'list' ? 'bg-[#232323] text-white' : 'text-muted'
            "
          />
          <UButton
            size="xl"
            icon="i-lucide-layout-grid"
            class="cursor-pointer size-9 rounded-r-md border-2 border-[#232323] hover:bg-[#232323] p-0 flex items-center justify-center"
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

    <USlideover
      v-model:open="isCreateContactSlideoverOpen"
      side="right"
      inset
      title="CREATE NEW CONTACT"
      :ui="{
        header: 'border-b-2 border-[#232323] px-6 py-6',
        title: 'text-sm font-medium tracking-[1.4px] text-white uppercase',
        body: 'px-6',
      }"
    >
      <template #body>
        <FormManualContact
          @close="isCreateContactSlideoverOpen = false"
          @submitted="refetchContacts()"
        />
      </template>
    </USlideover>

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
        size="xl"
        label="Clear Search"
        color="neutral"
        class="mt-2 rounded-full bg-white px-5 font-medium text-dark hover:bg-white/90"
        @click="
          () => {
            ownerSearchQuery = '';
          }
        "
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
      <p class="max-w-[18rem] text-center text-sm text-muted">
        Once people exchange contacts with your persona card, they will appear
        here.
      </p>
      <UButton
        label="Create New Contact"
        leading-icon="i-material-symbols-add"
        color="neutral"
        class="h-10 mt-2 rounded-full bg-white px-5 font-medium text-dark hover:bg-white/90"
        @click="onCreateContact"
      />
    </div>

    <div
      v-else-if="viewMode === 'list'"
      class="hide-scrollbar flex-1 overflow-x-auto overflow-y-hidden -mx-4 sm:mx-0 px-4 sm:px-0"
    >
      <UTable
        :data="pagedContacts"
        :columns="visibleColumns"
        :ui="{
          th: 'px-4 py-4 border-b border-[#232323]',
          td: 'px-4 py-3 border-b border-[#232323]',
          tr: 'bg-transparent',
          empty: 'py-16 text-center text-sm text-muted',
        }"
        class="w-full min-w-250"
      >
        <template #nameRole-cell="{ row }">
          <div class="leading-[1.35]">
            <p class="flex items-center gap-1 text-sm font-medium text-white">
              {{ row.original.name }}
              <NuxtLink
                v-if="
                  row.original.isLaPersonaContact && row.original.personaCardTo
                "
                :to="row.original.personaCardTo"
                class="scale-90 inline-flex h-4 w-7 shrink-0 cursor-pointer transition hover:opacity-80"
                aria-label="La Persona contact"
              >
                <IconLpBadge />
              </NuxtLink>
            </p>
            <p class="text-sm font-medium text-muted">
              {{ row.original.role }}
            </p>
          </div>
        </template>
        <template v-if="isOwner" #origin-cell="{ row }">
          <UButton
            size="xl"
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

    <div v-else class="flex-1">
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <UCard
          v-for="contact in gridContacts"
          :key="contact.id"
          :ui="{
            root: 'rounded-[8px] bg-[#171717] border border-transparent',
            body: 'p-5 sm:p-4',
            footer: 'border-t border-[#232323] p-5 sm:p-4',
          }"
        >
          <div class="space-y-2">
            <p
              class="flex items-center gap-1 text-xl font-medium leading-none text-white sm:text-[20px]"
            >
              {{ contact.name }}
              <NuxtLink
                v-if="contact.isLaPersonaContact && contact.personaCardTo"
                :to="contact.personaCardTo"
                class="inline-flex scale-90 h-4 w-7 shrink-0 cursor-pointer transition hover:opacity-80"
                aria-label="La Persona contact"
              >
                <IconLpBadge />
              </NuxtLink>
            </p>
            <p class="text-md leading-none text-muted sm:text-sm">
              {{ contact.role }}
            </p>
          </div>

          <div
            class="mt-12 space-y-4 text-md leading-none text-muted sm:mt-10 sm:space-y-2 sm:text-sm"
          >
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
                <p class="text-[14px] text-muted sm:text-xs">Origin</p>
                <UButton
                  size="xl"
                  v-if="contact.originTo"
                  :to="contact.originTo"
                  color="neutral"
                  variant="link"
                  class="mt-2 h-auto p-0 text-md leading-none text-white underline-offset-2 sm:mt-1 sm:text-sm"
                >
                  {{ contact.origin }}
                </UButton>
              </div>

              <UDropdownMenu :items="getActionItems(contact)">
                <UButton
                  size="xl"
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

    <div
      v-if="hasContacts"
      class="mt-auto flex items-center justify-center sm:justify-end pt-4 sm:pt-0"
    >
      <UPagination
        v-model:page="page"
        :total="total"
        :items-per-page="itemsPerPage"
        :sibling-count="0"
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
    title="What is Contacts?"
    :ui="{
      content:
        'sm:max-w-[480px] rounded-lg border border-[#232323] bg-[#171717]',
      title: 'text-sm font-medium uppercase tracking-widest text-white',
      body: 'px-5 py-4 sm:px-6 sm:py-5',
    }"
  >
    <template #body>
      <div class="space-y-5 sm:space-y-6">
        <div class="space-y-2">
          <h3
            class="text-lg font-medium leading-tight tracking-widest uppercase text-white sm:text-xl"
          >
            Your network, all in one place
          </h3>
          <p class="text-sm leading-relaxed text-[#8b8b8b]">
            Capture, review, and act on every contact.
          </p>
        </div>

        <div class="space-y-0">
          <div
            v-for="(item, index) in infoItems"
            :key="item.title"
            class="py-3 sm:py-3.5"
            :class="
              index < infoItems.length - 1 ? 'border-b border-[#2a2a2a]' : ''
            "
          >
            <div class="flex items-start gap-3">
              <UIcon
                :name="item.icon"
                class="mt-0.5 size-4.5 shrink-0 text-white sm:size-5"
              />
              <div class="min-w-0">
                <p class="text-sm font-medium text-white">{{ item.title }}</p>
                <p class="mt-1.5 text-sm leading-relaxed text-[#8b8b8b]">
                  {{ item.description }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="flex justify-end">
          <UButton
            size="md"
            label="Understood"
            color="neutral"
            class="h-10 justify-center rounded-full bg-white px-5 font-medium text-dark hover:bg-white/90"
            @click="
              () => {
                isInfoOpen = false;
              }
            "
          />
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
        size="xl"
        label="Cancel"
        color="neutral"
        variant="ghost"
        class="rounded-full px-5"
        :disabled="isDeletingContact"
        @click="closeDeleteConfirm"
      />
      <UButton
        size="xl"
        label="Delete"
        color="error"
        class="rounded-full px-6 font-medium"
        :loading="isDeletingContact"
        @click="onConfirmDelete"
      />
    </template>
  </UModal>
</template>
