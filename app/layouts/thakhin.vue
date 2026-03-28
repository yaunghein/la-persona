<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui';

const route = useRoute();
const open = ref(false);

const links = [
  {
    label: 'Overview',
    icon: 'i-lucide-layout-dashboard',
    to: ROUTES.THAKHIN.ROOT,
    onSelect: () => {
      open.value = false;
    },
  },
  {
    label: 'Requests',
    icon: 'i-lucide-file-clock',
    to: ROUTES.THAKHIN.REQUESTS,
    onSelect: () => {
      open.value = false;
    },
  },
  {
    label: 'Payments',
    icon: 'i-lucide-wallet-cards',
    to: ROUTES.THAKHIN.PAYMENTS,
    onSelect: () => {
      open.value = false;
    },
  },
  {
    label: 'Organizations',
    icon: 'i-lucide-building',
    to: ROUTES.THAKHIN.ORGANIZATIONS,
    onSelect: () => {
      open.value = false;
    },
  },
  {
    label: 'Cards',
    icon: 'i-lucide-credit-card',
    to: ROUTES.THAKHIN.CARDS,
    onSelect: () => {
      open.value = false;
    },
  },
  {
    label: 'Invitations',
    icon: 'i-lucide-user-plus',
    to: ROUTES.THAKHIN.INVITATIONS,
    onSelect: () => {
      open.value = false;
    },
  },
] satisfies NavigationMenuItem[];

const pageLabel: Record<string, string> = {
  [ROUTES.THAKHIN.ROOT]: 'Overview',
  [ROUTES.THAKHIN.REQUESTS]: 'Requests',
  [ROUTES.THAKHIN.PAYMENTS]: 'Payments',
  [ROUTES.THAKHIN.ORGANIZATIONS]: 'Organizations',
  [ROUTES.THAKHIN.CARDS]: 'Cards',
  [ROUTES.THAKHIN.INVITATIONS]: 'Invitations',
};

const currentPageLabel = computed(() => {
  const path = route.path;
  const specificMatch = Object.entries(pageLabel).find(
    ([key]) => key !== ROUTES.THAKHIN.ROOT && path.startsWith(key)
  );
  if (specificMatch) return specificMatch[1];
  return path === ROUTES.THAKHIN.ROOT ? pageLabel[ROUTES.THAKHIN.ROOT] : '';
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

    <UDashboardPanel id="thakhin-panel">
      <template #header>
        <UDashboardNavbar
          :title="currentPageLabel"
          class="uppercase text-sm tracking-[1.4px]"
        >
          <template #leading>
            <UDashboardSidebarCollapse />
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <slot />
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>
