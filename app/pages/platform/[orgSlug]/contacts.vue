<script setup lang="ts">
definePageMeta({
  layout: 'platform',
});

import type { TableColumn } from '@nuxt/ui';

type Contact = {
  id: string;
  name: string;
  role: string;
  company: string;
  phone: string;
  email: string;
  origin: string;
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
  actions: string;
};

// TODO: restore real fetch after finalizing the API payload.
// const { data: contacts } = await useFetch<ContactRow[]>(
//   '/api/contact-exchange'
// );

const baseContacts = [
  {
    name: 'Aung Pyae Kyaw',
    role: 'Designer',
    company: 'LA PERSONA',
    phone: '+66 1234 5678',
    email: 'aung@la-persona.com',
    origin: 'From Founders Card',
  },
  {
    name: 'Min Htet Myet',
    role: 'Business Development',
    company: 'LA PERSONA',
    phone: '+66 1234 5678',
    email: 'min@la-persona.com',
    origin: 'Shared by Min',
  },
  {
    name: 'Yan Aung Hein',
    role: 'Chief Technology Officer',
    company: 'LA PERSONA',
    phone: '+66 1234 5678',
    email: 'yan@la-persona.com',
    origin: 'Added Manually',
  },
  {
    name: 'Shune Lei Yee',
    role: 'Brand Strategist',
    company: 'LA PERSONA',
    phone: '+66 1200 1122',
    email: 'shune@la-persona.com',
    origin: 'Shared by Team',
  },
  {
    name: 'Ba Nyar Kyaw Kyaw',
    role: 'Frontend Developer',
    company: 'LA PERSONA',
    phone: '+66 5566 7788',
    email: 'banyar@la-persona.com',
    origin: 'From Founders Card',
  },
  {
    name: 'Matt Nay',
    role: 'Visual Storyteller',
    company: 'LA PERSONA',
    phone: '+66 3344 9988',
    email: 'matt@la-persona.com',
    origin: 'Added Manually',
  },
  {
    name: 'Min Htet Dipar',
    role: 'Creative Director',
    company: 'LA PERSONA',
    phone: '+66 7788 1100',
    email: 'dipar@la-persona.com',
    origin: 'Shared by Min',
  },
];

const toast = useToast();
const isInfoOpen = ref(false);
const route = useRoute();
const router = useRouter();

const parseViewMode = (value: unknown): 'list' | 'grid' =>
  value === 'grid' ? 'grid' : 'list';

const parsePage = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
};

const viewMode = ref<'list' | 'grid'>(parseViewMode(route.query.view));

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

const contacts = ref<ContactRow[]>(
  Array.from({ length: 30 }, (_, index) => {
    const seed = baseContacts[index % baseContacts.length]!;
    return {
      id: String(index + 1),
      name: seed.name,
      role: seed.role,
      nameRole: `${seed.name}\n${seed.role}`,
      company: seed.company,
      phone: seed.phone,
      email: seed.email,
      origin: seed.origin,
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
  }))
);

const onCreateContact = () => {
  toast.add({
    title: 'Coming soon',
    description: 'Create new contact flow will be wired next.',
    color: 'neutral',
  });
};

const onExport = () => {
  toast.add({
    title: 'Export started',
    description: 'Sample export action triggered.',
    color: 'success',
  });
};

const onRowMenu = (name: string) => {
  toast.add({
    title: name,
    description: 'Row actions coming soon.',
    color: 'neutral',
  });
};

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
        td: 'text-sm font-medium text-white whitespace-pre-line leading-[1.35]',
      },
    },
  },
  {
    accessorKey: 'company',
    header: 'COMPANY',
    meta: {
      class: {
        th: 'text-sm font-medium uppercase tracking-widest text-white',
        td: 'text-sm font-medium text-[#8b8b8b]',
      },
    },
  },
  {
    accessorKey: 'phone',
    header: 'PHONE NUMBER',
    meta: {
      class: {
        th: 'text-sm font-medium uppercase tracking-widest text-white',
        td: 'text-sm font-medium text-[#8b8b8b]',
      },
    },
  },
  {
    accessorKey: 'email',
    header: 'EMAIL',
    meta: {
      class: {
        th: 'text-sm font-medium uppercase tracking-widest text-white',
        td: 'text-sm font-medium text-[#8b8b8b]',
      },
    },
  },
  {
    accessorKey: 'origin',
    header: 'ORIGIN',
    meta: {
      class: {
        th: 'text-sm font-medium uppercase tracking-widest text-white',
        td: 'text-sm font-medium text-[#8b8b8b]',
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
</script>

<template>
  <div class="flex min-h-[calc(100dvh-11rem)] flex-col gap-8">
    <div class="flex flex-wrap items-center justify-between gap-4 pb-5">
      <div class="flex items-center gap-2">
        <h1
          class="text-[1.75rem] font-normal leading-tight tracking-widest uppercase"
        >
          People you've connected with
        </h1>
        <UButton
          icon="i-lucide-circle-alert"
          color="neutral"
          variant="ghost"
          class="size-6 rounded-full p-0 text-muted hover:bg-[#232323]"
          aria-label="Open contacts information"
          @click="isInfoOpen = true"
        />
      </div>

      <div class="flex items-center gap-2">
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

    <div
      v-if="viewMode === 'list'"
      class="hide-scrollbar flex-1 overflow-x-auto overflow-y-hidden"
    >
      <UTable
        :data="pagedContacts"
        :columns="columns"
        @select="
          (_, row) =>
            onRowMenu(row.original.nameRole.split('\n')[0] || 'Contact')
        "
        :ui="{
          th: 'px-4 py-4 border-b border-[#232323]',
          td: 'px-4 py-4 border-b border-[#232323]',
          tr: 'bg-transparent',
          empty: 'py-16 text-center text-sm text-muted',
        }"
        class="w-full min-w-[1000px]"
      />
    </div>

    <div v-else class="flex-1">
      <div class="mb-5 flex items-center gap-1 text-sm text-[#8b8b8b]">
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
            <p class="text-sm text-[#8b8b8b]">{{ contact.role }}</p>
          </div>

          <div class="mt-10 space-y-2 text-sm text-[#8b8b8b]">
            <p>{{ contact.phone }}</p>
            <p>{{ contact.email }}</p>
            <p>{{ contact.company }}</p>
          </div>

          <template #footer>
            <div class="flex items-end justify-between">
              <div>
                <p class="text-xs text-[#8b8b8b]">Origin</p>
                <p class="text-sm text-white">{{ contact.origin }}</p>
              </div>

              <UButton
                icon="i-mdi-dots-vertical"
                color="neutral"
                variant="ghost"
                class="text-muted"
                @click="onRowMenu(contact.name)"
              />
            </div>
          </template>
        </UCard>
      </div>
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
            class="size-6 rounded-full p-0 text-white hover:bg-[#232323]"
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
              <p class="text-sm leading-[21px] text-[#8b8b8b]">
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
                    <p class="mt-2 text-[14px] text-[#8b8b8b]">
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
</template>
