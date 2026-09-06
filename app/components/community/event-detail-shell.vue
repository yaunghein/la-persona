<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui';
import type { CommunityEventDetailTab } from '~~/shared/types/community-event-detail';

const props = defineProps<{
  title: string;
  status: 'upcoming' | 'past';
  activeTab: CommunityEventDetailTab;
}>();

const emit = defineEmits<{
  back: [];
  'update:activeTab': [tab: CommunityEventDetailTab];
}>();

const tabItems: TabsItem[] = [
  { label: 'Overview', value: 'overview' },
  { label: 'Attendees', value: 'attendees' },
  { label: 'Check-in', value: 'check-in' },
  { label: 'Event Settings', value: 'settings' },
];

const selectedTab = computed({
  get: () => props.activeTab,
  set: (value: string | number) => {
    emit('update:activeTab', String(value) as CommunityEventDetailTab);
  },
});
</script>

<template>
  <div class="flex min-h-[calc(100dvh-11rem)] flex-col gap-8 pb-8">
    <div class="flex flex-col gap-6 pt-2 sm:pt-0">
      <div
        class="flex flex-wrap items-center gap-y-2 -translate-x-2 sm:translate-x-0"
      >
        <UButton
          icon="i-lucide-chevron-left"
          color="neutral"
          variant="ghost"
          class="mr-1 size-10 cursor-pointer text-white hover:bg-white/10"
          aria-label="Back to events"
          @click="emit('back')"
        />
        <h1
          class="text-xl font-normal leading-5 tracking-[0.175rem] uppercase text-white sm:text-[1.75rem]"
        >
          {{ title }}
        </h1>
        <span
          class="ml-3 rounded-md bg-dark px-2.5 py-1.5 text-[0.625rem] font-medium text-white uppercase tracking-wider"
        >
          {{ status === 'upcoming' ? 'Upcoming' : 'Past' }}
        </span>
      </div>

      <UTabs
        v-model="selectedTab"
        :items="tabItems"
        :content="false"
        color="neutral"
        variant="pill"
        size="lg"
        :ui="{
          root: 'items-start w-fit max-w-full',
          list: 'bg-[#171717] w-fit max-w-full rounded-lg p-1 overflow-x-auto',
          indicator: 'bg-[#232323]',
          trigger:
            'data-[state=active]:text-white data-[state=inactive]:text-[#8b8b8b] rounded-md px-4 py-2.5 grow-0',
        }"
      />
    </div>

    <slot />
  </div>
</template>
