<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui';

const route = useRoute();
const toast = useToast();

const open = ref(false);

const links = [
  [
    {
      label: 'Insights',
      icon: 'i-gg:insights',
      to: `/platform/${route.params.orgSlug}`,
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: 'Cards',
      icon: 'i-material-symbols:cards-stack-outline-sharp',
      to: `/platform/${route.params.orgSlug}/cards`,
      // badge: '4',
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: 'Contacts',
      icon: 'i-material-symbols:perm-contact-calendar-sharp',
      to: `/platform/${route.params.orgSlug}/contacts`,
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: 'Billing',
      icon: 'uil:bill',
      to: `/platform/${route.params.orgSlug}/billing`,
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: 'Teams (Coming Soon)',
      icon: 'i-ri:team-line',
      to: `/platform/${route.params.orgSlug}/teams`,
      onSelect: () => {
        open.value = false;
      },
    },
    // {
    //   label: 'Settings',
    //   to: '',
    //   icon: 'i-lucide-settings',
    //   defaultOpen: true,
    //   type: 'trigger',
    //   children: [
    //     {
    //       label: 'General',
    //       to: '',
    //       exact: true,
    //       onSelect: () => {
    //         open.value = false;
    //       },
    //     },
    //     {
    //       label: 'Members',
    //       to: '',
    //       onSelect: () => {
    //         open.value = false;
    //       },
    //     },
    //     {
    //       label: 'Notifications',
    //       to: '',
    //       onSelect: () => {
    //         open.value = false;
    //       },
    //     },
    //     {
    //       label: 'Security',
    //       to: '',
    //       onSelect: () => {
    //         open.value = false;
    //       },
    //     },
    //   ],
    // },
  ],
  // [
  //   {
  //     label: 'Feedback',
  //     icon: 'i-lucide-message-circle',
  //     to: 'https://github.com/nuxt-ui-templates/dashboard',
  //     target: '_blank',
  //   },
  //   {
  //     label: 'Help & Support',
  //     icon: 'i-lucide-info',
  //     to: 'https://github.com/nuxt-ui-templates/dashboard',
  //     target: '_blank',
  //   },
  // ],
] satisfies NavigationMenuItem[][];

const groups = computed(() => [
  {
    id: 'links',
    label: 'Go to',
    items: links.flat(),
  },
  {
    id: 'code',
    label: 'Code',
    items: [
      {
        id: 'source',
        label: 'View page source',
        icon: 'i-simple-icons-github',
        to: `https://github.com/nuxt-ui-templates/dashboard/blob/main/app/pages${route.path === '/' ? '/index' : route.path}.vue`,
        target: '_blank',
      },
    ],
  },
]);

onMounted(async () => {
  const cookie = useCookie('cookie-consent');
  if (cookie.value === 'accepted') {
    return;
  }

  toast.add({
    title:
      'We use first-party cookies to enhance your experience on our website.',
    duration: 0,
    close: false,
    actions: [
      {
        label: 'Accept',
        color: 'neutral',
        variant: 'outline',
        onClick: () => {
          cookie.value = 'accepted';
        },
      },
      {
        label: 'Opt out',
        color: 'neutral',
        variant: 'ghost',
      },
    ],
  });
});

import { sub } from 'date-fns';
import type { DropdownMenuItem } from '@nuxt/ui';
import type { Period, Range } from '~/types';
import type { FeedbackKind } from '~~/shared/types/feedback';
import { FEEDBACK_KIND_LABELS } from '~~/shared/types/feedback';

// const { isNotificationsSlideoverOpen } = useDashboard()

const range = shallowRef<Range>({
  start: sub(new Date(), { days: 14 }),
  end: new Date(),
});
const period = ref<Period>('daily');
const isFeedbackSlideoverOpen = ref(false);
const feedbackKind = ref<FeedbackKind>('feedback');

function openFeedbackSlideover(kind: FeedbackKind) {
  feedbackKind.value = kind;
  isFeedbackSlideoverOpen.value = true;
  open.value = false;
}

const feedbackHeaderLabel = computed(
  () => FEEDBACK_KIND_LABELS[feedbackKind.value]
);

const currentPageLabel = computed(() => {
  const path = route.path;
  const orgSlug = String(route.params.orgSlug || '');
  if (!orgSlug) return path === ROUTES.PLATFORM.ROOT ? 'Insights' : '';

  const basePath = `${ROUTES.PLATFORM.ROOT}/${orgSlug}`;
  if (path === basePath) return 'Insights';
  if (path.startsWith(`${basePath}/cards`)) return 'Cards';
  if (path.startsWith(`${basePath}/contacts`)) return 'Contacts';
  if (path.startsWith(`${basePath}/billing`)) return 'Billing';
  if (path.startsWith(`${basePath}/teams`)) return 'Teams';

  return '';
});
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="default"
      v-model:open="open"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header="{ collapsed }">
        <!-- <TeamsMenu :collapsed="collapsed" /> -->

        <NuxtLink
          v-if="!collapsed"
          to="/platform"
          class="w-40 sm:w-46 aspect-[1/0.11]"
        >
          <IconLogo />
        </NuxtLink>
        <NuxtLink v-else to="/platform" class="w-20 aspect-square">
          <IconLogoShort />
        </NuxtLink>
      </template>

      <template #default="{ collapsed }">
        <!-- <UDashboardSearchButton
          :collapsed="collapsed"
          class="bg-transparent ring-default"
        /> -->

        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[0]"
          orientation="vertical"
          tooltip
          popover
          class="[&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1 py-4 [&_a]:py-2 [&_a]:font-semibold"
        />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[1]"
          orientation="vertical"
          tooltip
          class="mt-auto"
        />
        <HelpFeedbackMenu
          :collapsed="collapsed"
          @open-feedback="openFeedbackSlideover"
        />
      </template>

      <template #footer="{ collapsed }">
        <div class="w-full space-y-1">
          <UserMenu :collapsed="collapsed" />
        </div>
      </template>
    </UDashboardSidebar>

    <UDashboardSearch :groups="groups" />

    <UDashboardPanel id="home">
      <template #header>
        <UDashboardNavbar
          :title="currentPageLabel"
          :ui="{ right: 'gap-3' }"
          class="uppercase text-sm tracking-[1.4px]"
        >
          <template #leading>
            <UDashboardSidebarCollapse />
          </template>

          <template #right>
            <!-- <UTooltip text="Notifications" :shortcuts="['N']">
            <UButton
              color="neutral"
              variant="ghost"
              square
              @click="isNotificationsSlideoverOpen = true"
            >
              <UChip color="error" inset>
                <UIcon name="i-lucide-bell" class="size-5 shrink-0" />
              </UChip>
            </UButton>
          </UTooltip> -->

            <!-- <UDropdownMenu :items="items">
              <UButton icon="i-lucide-plus" size="md" class="rounded-full" />
            </UDropdownMenu> -->
          </template>
        </UDashboardNavbar>

        <!-- <UDashboardToolbar>
        <template #left>
          NOTE: The `-ms-1` class is used to align with the `DashboardSidebarCollapse` button here.
          <HomeDateRangePicker v-model="range" class="-ms-1" />

          <HomePeriodSelect v-model="period" :range="range" />
          left
        </template>
      </UDashboardToolbar> -->
      </template>

      <template #body>
        <!-- <HomeStats :period="period" :range="range" />
      <HomeChart :period="period" :range="range" />
      <HomeSales :period="period" :range="range" /> -->
        <slot />
      </template>
    </UDashboardPanel>

    <USlideover
      v-model:open="isFeedbackSlideoverOpen"
      side="right"
      inset
      :title="feedbackHeaderLabel"
      :ui="{
        content: 'bg-[#171717]',
        header: 'border-b-2 border-[#232323] px-6 py-6',
        title: 'text-sm font-medium tracking-[1.4px] text-white uppercase',
        body: 'px-6 pt-6 pb-8',
      }"
    >
      <template #body>
        <FormFeedbackSubmission
          :kind="feedbackKind"
          @close="isFeedbackSlideoverOpen = false"
        />
      </template>
    </USlideover>

    <!-- <NotificationsSlideover /> -->
  </UDashboardGroup>
</template>
