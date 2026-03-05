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
] satisfies NavigationMenuItem[];

const pageLabel: Record<string, string> = {
  [ROUTES.THAKHIN.ROOT]: 'Overview',
  [ROUTES.THAKHIN.REQUESTS]: 'Requests',
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
      <template #header>
        <NuxtLink to="/thakhin" class="w-44 aspect-[1/0.11]">
          <SvgLogo />
        </NuxtLink>
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
