<script setup lang="ts">
import type {
  CommunityEvent,
  CommunityEventsData,
} from '~~/shared/types/community-events';

const props = defineProps<{
  data: CommunityEventsData;
}>();

const emit = defineEmits<{
  create: [];
  edit: [event: CommunityEvent];
  share: [event: CommunityEvent];
  open: [event: CommunityEvent];
}>();

const searchQuery = ref('');
const statusFilter = ref('all');
const page = ref(1);
const itemsPerPage = 6;
const isInfoOpen = ref(false);

const filteredEvents = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();

  return props.data.events.filter((event) => {
    if (statusFilter.value !== 'all' && event.status !== statusFilter.value) {
      return false;
    }

    if (!query) return true;

    return (
      event.title.toLowerCase().includes(query) ||
      event.location.toLowerCase().includes(query) ||
      event.dateLabel.toLowerCase().includes(query)
    );
  });
});

const total = computed(() => filteredEvents.value.length);
const pagedEvents = computed(() => {
  const start = (page.value - 1) * itemsPerPage;
  return filteredEvents.value.slice(start, start + itemsPerPage);
});

watch([searchQuery, statusFilter], () => {
  page.value = 1;
});

watch(filteredEvents, () => {
  const maxPage = Math.max(1, Math.ceil(total.value / itemsPerPage));
  if (page.value > maxPage) page.value = maxPage;
});

function openInfo() {
  isInfoOpen.value = true;
}

function closeInfo() {
  isInfoOpen.value = false;
}

function onShare(event: CommunityEvent) {
  emit('share', event);
}

function onEdit(event: CommunityEvent) {
  emit('edit', event);
}

function onOpen(event: CommunityEvent) {
  emit('open', event);
}

const filterSelectUi = {
  base: 'h-9 w-full rounded-full border border-[#232323] bg-transparent px-5 text-sm font-medium text-[#8b8b8b] ring-0 focus:ring-0',
  content: 'border border-[#2a2a2a] bg-[#171717]',
  item: 'text-white data-[highlighted]:bg-[#232323]',
  value: 'text-[#8b8b8b]',
  trailingIcon: 'text-[#8b8b8b]',
};
</script>

<template>
  <div class="flex min-h-[calc(100dvh-11rem)] flex-col">
    <div
      class="flex flex-col gap-8 border-b border-[#232323] pb-6 pt-2 sm:pt-0"
    >
      <div
        class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="flex items-center gap-3">
          <h1
            class="text-xl font-normal leading-5 tracking-[0.175rem] uppercase text-white sm:text-[1.75rem]"
          >
            {{ data.title }}
          </h1>
          <UButton
            icon="i-material-symbols:info-outline"
            color="neutral"
            variant="ghost"
            class="size-5 cursor-pointer p-0 text-white hover:bg-transparent"
            aria-label="Open events information"
            @click="openInfo"
          />
        </div>

        <UButton
          label="Create Event"
          leading-icon="i-material-symbols:add"
          color="neutral"
          class="h-9 w-fit cursor-pointer rounded-full bg-white py-2 pr-6 pl-5 text-sm font-medium text-dark hover:bg-white/90"
          @click="emit('create')"
        />
      </div>

      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <UInput
          v-model="searchQuery"
          :placeholder="data.searchPlaceholder"
          trailing-icon="i-lucide-search"
          color="neutral"
          variant="soft"
          class="w-full flex-1"
          :ui="{
            base: 'h-9 rounded-full border-0 bg-[#232323] px-5 text-sm font-medium text-white ring-0 placeholder:text-[#8b8b8b] focus-visible:ring-0',
            trailing: 'pe-5',
            trailingIcon: 'size-6 text-[#8b8b8b]',
          }"
        />
        <USelect
          v-model="statusFilter"
          :items="data.statusOptions"
          color="neutral"
          class="w-full sm:w-37.75 sm:shrink-0"
          :ui="filterSelectUi"
        />
      </div>
    </div>

    <div
      class="grid flex-1 grid-cols-1 gap-6 py-8 sm:grid-cols-2 xl:grid-cols-3"
    >
      <article
        v-for="event in pagedEvents"
        :key="event.id"
        class="flex flex-col overflow-hidden rounded-lg"
      >
        <button
          type="button"
          class="relative aspect-[1/0.75] w-full cursor-pointer overflow-hidden rounded-t-lg text-left"
          @click="onOpen(event)"
        >
          <img
            :src="event.imageUrl"
            :alt="event.title"
            class="size-full object-cover"
          />
          <span
            class="absolute top-1.5 right-1.5 rounded-[4px] bg-[#232323] px-2.5 py-2.5 text-[0.625rem] font-bold tracking-wide uppercase"
            :class="
              event.status === 'upcoming' ? 'text-white' : 'text-[#8b8b8b]'
            "
          >
            {{ event.status === 'upcoming' ? 'Upcoming' : 'Past' }}
          </span>
        </button>

        <div
          class="flex flex-col gap-4 rounded-b-lg bg-[#171717] p-5"
        >
          <button
            type="button"
            class="flex min-h-11 cursor-pointer flex-col gap-1 text-left"
            @click="onOpen(event)"
          >
            <h2 class="line-clamp-1 text-base leading-5 text-white">
              {{ event.title }}
            </h2>
            <p
              class="flex flex-wrap items-center gap-2 text-xs leading-5 text-[#8b8b8b]"
            >
              <span>{{ event.dateLabel }}</span>
              <span
                class="size-0.5 shrink-0 rounded-full bg-[#8b8b8b]"
                aria-hidden="true"
              />
              <span class="line-clamp-1">{{ event.location }}</span>
            </p>
          </button>

          <div class="flex items-center justify-between">
            <UButton
              icon="i-lucide-pencil"
              color="neutral"
              class="size-7 cursor-pointer rounded-[4px] bg-[#232323] p-1 text-white hover:bg-[#2a2a2a]"
              aria-label="Edit event"
              @click.stop="onEdit(event)"
            />
            <UButton
              icon="i-lucide-share-2"
              color="neutral"
              variant="ghost"
              class="size-7 cursor-pointer rounded-[4px] p-1 text-white hover:bg-[#232323]"
              aria-label="Share event"
              @click.stop="onShare(event)"
            />
          </div>
        </div>
      </article>

      <div
        v-if="!pagedEvents.length"
        class="col-span-full flex items-center justify-center py-20 text-sm text-[#8b8b8b]"
      >
        No events match your search.
      </div>
    </div>

    <div class="mt-auto flex items-center justify-end pt-2">
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
  </div>

  <UModal
    v-model:open="isInfoOpen"
    title="What are events?"
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
            Host community events
          </h3>
          <p class="text-sm leading-relaxed text-[#8b8b8b]">
            Create events, manage registration, and keep your community coming
            back.
          </p>
        </div>

        <div class="space-y-0">
          <div
            v-for="(item, index) in data.infoItems"
            :key="item.title"
            class="py-3 sm:py-3.5"
            :class="
              index < data.infoItems.length - 1
                ? 'border-b border-[#2a2a2a]'
                : ''
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
            @click="closeInfo"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
