<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui';
import { refDebounced } from '@vueuse/core';

const route = useRoute();
const open = ref(false);
const searchTerm = ref('');
const debouncedSearch = refDebounced(searchTerm, 200);

const { data: overview } = useAdminOverviewQuery();
const { data: searchResults, isFetching: searchLoading } =
  useAdminSearchQuery(debouncedSearch);

function close() {
  open.value = false;
}

function badge(count?: number) {
  if (!count) return undefined;
  return String(count);
}

const links = computed(() => {
  const queues = overview.value?.queues;
  const requestCount =
    (queues?.designRequests.count || 0) + (queues?.updateRequests.count || 0);

  return [
    {
      label: 'Dashboard',
      icon: 'i-material-symbols:space-dashboard-outline-sharp',
      to: ROUTES.THAKHIN.ROOT,
      exact: true,
      onSelect: close,
    },
    {
      label: 'Requests',
      icon: 'i-material-symbols:assignment-outline-sharp',
      to: ROUTES.THAKHIN.REQUESTS,
      badge: badge(requestCount),
      onSelect: close,
    },
    {
      label: 'Payments',
      icon: 'i-material-symbols:payments-outline-sharp',
      to: ROUTES.THAKHIN.PAYMENTS,
      badge: badge(queues?.standalonePayments.count),
      onSelect: close,
    },
    {
      label: 'People',
      icon: 'i-material-symbols:group-outline-sharp',
      to: ROUTES.THAKHIN.USERS,
      onSelect: close,
    },
    {
      label: 'Organizations',
      icon: 'i-material-symbols:corporate-fare-sharp',
      to: ROUTES.THAKHIN.ORGANIZATIONS,
      onSelect: close,
    },
    {
      label: 'Cards',
      icon: 'i-material-symbols:cards-stack-outline-sharp',
      to: ROUTES.THAKHIN.CARDS,
      onSelect: close,
    },
    {
      label: 'Invitations',
      icon: 'i-material-symbols:forward-to-inbox-outline-sharp',
      to: ROUTES.THAKHIN.INVITATIONS,
      badge: badge(queues?.expiringInvitations.count),
      onSelect: close,
    },
    {
      label: 'Inbox',
      icon: 'i-material-symbols:inbox-outline-sharp',
      to: ROUTES.THAKHIN.INBOX,
      onSelect: close,
    },
  ] satisfies NavigationMenuItem[];
});

const pageLabel: Record<string, string> = {
  [ROUTES.THAKHIN.ROOT]: 'Dashboard',
  [ROUTES.THAKHIN.REQUESTS]: 'Requests',
  [ROUTES.THAKHIN.PAYMENTS]: 'Payments',
  [ROUTES.THAKHIN.ORGANIZATIONS]: 'Organizations',
  [ROUTES.THAKHIN.USERS]: 'People',
  [ROUTES.THAKHIN.CARDS]: 'Cards',
  [ROUTES.THAKHIN.INVITATIONS]: 'Invitations',
  [ROUTES.THAKHIN.INBOX]: 'Inbox',
};

const currentPageLabel = computed(() => {
  const path = route.path;
  const specificMatch = Object.entries(pageLabel).find(
    ([key]) => key !== ROUTES.THAKHIN.ROOT && path.startsWith(key)
  );
  if (specificMatch) return specificMatch[1];
  return path === ROUTES.THAKHIN.ROOT ? pageLabel[ROUTES.THAKHIN.ROOT] : '';
});

const searchGroups = computed(() => {
  const pages = links.value
    .filter((item) => item.to)
    .map((item) => ({
      label: item.label,
      icon: item.icon,
      to: item.to,
      onSelect: close,
    }));

  const results = searchResults.value;
  return [
    {
      id: 'pages',
      label: 'Pages',
      items: pages,
    },
    {
      id: 'users',
      label: 'People',
      items: (results?.users || []).map((item) => ({
        label: item.label,
        icon: 'i-material-symbols:person-outline-sharp',
        to: item.href,
        onSelect: close,
      })),
    },
    {
      id: 'organizations',
      label: 'Organizations',
      items: (results?.organizations || []).map((item) => ({
        label: item.label,
        icon: 'i-material-symbols:corporate-fare-sharp',
        to: item.href,
        onSelect: close,
      })),
    },
    {
      id: 'cards',
      label: 'Cards',
      items: (results?.cards || []).map((item) => ({
        label: item.label,
        icon: 'i-material-symbols:cards-stack-outline-sharp',
        to: item.href,
        onSelect: close,
      })),
    },
  ];
});
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="thakhin"
      v-model:open="open"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header="{ collapsed }">
        <div class="flex w-full items-center justify-between gap-2">
          <NuxtLink
            v-if="!collapsed"
            to="/thakhin"
            class="w-44 aspect-[1/0.11]"
          >
            <IconLogoMark />
          </NuxtLink>
          <NuxtLink v-else to="/thakhin" class="w-10 aspect-square">
            <IconLogoShort />
          </NuxtLink>
        </div>
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu
          :collapsed="collapsed"
          :items="links"
          orientation="vertical"
          tooltip
          popover
          :class="
            collapsed
              ? 'py-4 [&_ul]:flex [&_ul]:flex-col [&_ul]:items-center [&_ul]:gap-2 [&_a]:size-9 [&_a]:justify-center [&_a]:px-0 [&_a]:py-0 [&_a]:font-medium [&_a]:before:inset-0'
              : 'py-4 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-2 [&_a]:px-2.5 [&_a]:py-1.5 [&_a]:font-medium'
          "
        />
        <UNavigationMenu
          :collapsed="collapsed"
          :items="[
            {
              label: 'Back to Platform',
              icon: 'i-material-symbols:arrow-back-sharp',
              to: ROUTES.PLATFORM.ROOT,
              onSelect: close,
            },
          ]"
          orientation="vertical"
          tooltip
          :class="
            collapsed
              ? 'mt-auto [&_a]:size-9 [&_a]:justify-center [&_a]:px-0 [&_a]:py-0 [&_a]:font-medium'
              : 'mt-auto [&_a]:px-2.5 [&_a]:py-1.5 [&_a]:font-medium'
          "
        />
      </template>

      <template #footer="{ collapsed }">
        <LayoutUserMenu :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>

    <UDashboardSearch
      v-model:search-term="searchTerm"
      :groups="searchGroups"
      :loading="searchLoading"
      placeholder="Search people, organizations, cards"
      :color-mode="false"
    />

    <UDashboardPanel id="thakhin-panel">
      <template #header>
        <UDashboardNavbar
          :title="currentPageLabel"
          :ui="{ right: 'gap-3' }"
          class="border-b border-raised bg-surface text-sm uppercase tracking-[1.4px]"
        >
          <template #leading>
            <UTooltip text="Toggle sidebar">
              <UDashboardSidebarCollapse />
            </UTooltip>
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <slot />
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>
