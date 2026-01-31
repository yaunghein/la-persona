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
      to: ROUTES.PLATFORM.ROOT,
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: 'Cards',
      icon: 'i-material-symbols:cards-stack-outline-sharp',
      to: ROUTES.PLATFORM.CARDS,
      // badge: '4',
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: 'Contacts',
      icon: 'i-material-symbols:perm-contact-calendar-sharp',
      to: ROUTES.PLATFORM.CONTACTS,
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: 'Teams',
      icon: 'i-ri:team-line',
      to: '/',
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

// const { isNotificationsSlideoverOpen } = useDashboard()

const items = [
  [
    {
      label: 'Request New Card',
      icon: 'i-lucide-send',
      to: ROUTES.PLATFORM.CARDS,
    },
    // {
    //   label: 'New customer',
    //   icon: 'i-lucide-user-plus',
    //   to: '/customers',
    // },
  ],
] satisfies DropdownMenuItem[][];

const range = shallowRef<Range>({
  start: sub(new Date(), { days: 14 }),
  end: new Date(),
});
const period = ref<Period>('daily');

const pageLabel: Record<string, string> = {
  [ROUTES.PLATFORM.ROOT]: 'Insights',
  [ROUTES.PLATFORM.CARDS]: 'Cards',
  [ROUTES.PLATFORM.CONTACTS]: 'Contacts',
} as const;

const currentPageLabel = computed(() => {
  const path = route.path;
  const specificMatch = Object.entries(pageLabel).find(
    ([key]) => key !== '/platform' && path.startsWith(key)
  );
  if (specificMatch) return specificMatch[1];
  return path === ROUTES.PLATFORM.ROOT ? pageLabel[ROUTES.PLATFORM.ROOT] : '';
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
        <NuxtLink to="/platform" class="w-44 aspect-[1/0.11]">
          <SvgLogo />
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
      </template>

      <template #footer="{ collapsed }">
        <UserMenu :collapsed="collapsed" />
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

    <!-- <NotificationsSlideover /> -->
  </UDashboardGroup>
</template>
