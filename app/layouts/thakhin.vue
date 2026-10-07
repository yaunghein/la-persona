<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui';
import { useQuery } from '@tanstack/vue-query';
import { refDebounced } from '@vueuse/core';
import type { AdminOverview, AdminSearchResult } from '~~/shared/types/admin-overview';

const route = useRoute();
const open = ref(false);
const searchTerm = ref('');
const debouncedSearch = refDebounced(searchTerm, 200);

const { data: overview } = useQuery({
  queryKey: QUERY_KEYS.adminOverview,
  queryFn: () => $fetch<AdminOverview>('/api/admin/overview'),
});

const { data: searchResults, isFetching: searchLoading } = useQuery({
  queryKey: computed(() => ['admin-search', debouncedSearch.value]),
  queryFn: () =>
    $fetch<AdminSearchResult>(
      `/api/admin/search?q=${encodeURIComponent(debouncedSearch.value)}`
    ),
  enabled: computed(() => debouncedSearch.value.trim().length >= 2),
});

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
      icon: 'i-lucide-layout-dashboard',
      to: ROUTES.THAKHIN.ROOT,
      exact: true,
      onSelect: close,
    },
    {
      label: 'Requests',
      icon: 'i-lucide-file-clock',
      to: ROUTES.THAKHIN.REQUESTS,
      badge: badge(requestCount),
      onSelect: close,
    },
    {
      label: 'Payments',
      icon: 'i-lucide-wallet-cards',
      to: ROUTES.THAKHIN.PAYMENTS,
      badge: badge(queues?.standalonePayments.count),
      onSelect: close,
    },
    {
      label: 'People',
      icon: 'i-lucide-users',
      to: ROUTES.THAKHIN.USERS,
      onSelect: close,
    },
    {
      label: 'Organizations',
      icon: 'i-lucide-building',
      to: ROUTES.THAKHIN.ORGANIZATIONS,
      onSelect: close,
    },
    {
      label: 'Cards',
      icon: 'i-lucide-credit-card',
      to: ROUTES.THAKHIN.CARDS,
      onSelect: close,
    },
    {
      label: 'Invitations',
      icon: 'i-lucide-user-plus',
      to: ROUTES.THAKHIN.INVITATIONS,
      badge: badge(queues?.expiringInvitations.count),
      onSelect: close,
    },
    {
      label: 'Inbox',
      icon: 'i-lucide-inbox',
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
        icon: 'i-lucide-user',
        to: item.href,
        onSelect: close,
      })),
    },
    {
      id: 'organizations',
      label: 'Organizations',
      items: (results?.organizations || []).map((item) => ({
        label: item.label,
        icon: 'i-lucide-building',
        to: item.href,
        onSelect: close,
      })),
    },
    {
      id: 'cards',
      label: 'Cards',
      items: (results?.cards || []).map((item) => ({
        label: item.label,
        icon: 'i-lucide-credit-card',
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
            <SvgLogo />
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
          class="[&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1 py-4 [&_a]:py-2 [&_a]:font-semibold"
        />
      </template>

      <template #footer="{ collapsed }">
        <UserMenu :collapsed="collapsed" />
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
          class="uppercase text-sm tracking-[1.4px]"
        >
          <template #leading>
            <UDashboardSidebarCollapse />
          </template>
          <template #right>
            <UDashboardSearchButton />
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <slot />
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>
