<script setup lang="ts">
import type { UserOrganization } from '~/composables/user-organizations';

const props = defineProps<{
  orgs: UserOrganization[];
  collapsed: boolean;
}>();

const emit = defineEmits<{
  select: [];
}>();

type CommunityNavPreference = {
  ready: boolean;
  slugs: string[];
};

const route = useRoute();
const { data: session } = await authClient.useSession(useFetch);
const storageKey = `lp-community-nav:${session.value?.user?.id || 'anonymous'}`;
const preference = useLocalStorage<CommunityNavPreference>(storageKey, {
  ready: false,
  slugs: [],
});
const hoveredSlug = ref<string | null>(null);

if (import.meta.client) {
  localStorage.removeItem(
    `lp-community-nav-expanded:${session.value?.user?.id || 'anonymous'}`
  );
}

type CommunityLink = {
  label: string;
  to: string;
  exact?: boolean;
};

function linksFor(org: UserOrganization): CommunityLink[] {
  const base = `${ROUTES.PLATFORM.ROOT}/${org.slug}`;
  if (isCommunityMemberOnlyOrg(org)) {
    return [
      { label: 'Events', to: `${base}/events` },
      { label: 'About', to: `${base}/about` },
    ];
  }

  return [
    { label: 'Insights', to: base, exact: true },
    { label: 'Members', to: `${base}/members` },
    { label: 'Events', to: `${base}/events` },
    { label: 'Settings', to: `${base}/settings` },
  ];
}

function expandedSlugs() {
  const slugs = preference.value.slugs;
  return Array.isArray(slugs) ? slugs : [];
}

function isExpanded(slug: string) {
  return expandedSlugs().includes(slug);
}

function toggle(slug: string) {
  const current = expandedSlugs();
  preference.value = {
    ready: true,
    slugs: current.includes(slug)
      ? current.filter((item) => item !== slug)
      : [...current, slug],
  };
}

function isActive(link: CommunityLink) {
  if (link.exact) return route.path === link.to;
  return route.path === link.to || route.path.startsWith(`${link.to}/`);
}

function onSelect() {
  emit('select');
}

watch(
  () => props.orgs,
  (orgs) => {
    if (!orgs.length || preference.value.ready) return;
    const firstCommunity = orgs[0];
    if (!firstCommunity) return;
    preference.value = { ready: true, slugs: [firstCommunity.slug] };
  },
  { immediate: true }
);
</script>

<template>
  <div v-if="orgs.length" class="flex flex-col gap-4">
    <p
      v-if="!collapsed"
      class="px-2 text-sm font-medium uppercase tracking-[1.4px] text-white"
    >
      Communities
    </p>

    <div v-if="collapsed" class="flex flex-col items-center gap-2">
      <UPopover
        v-for="org in orgs"
        :key="org.slug"
        :content="{ align: 'start', side: 'right', sideOffset: 8 }"
        :ui="{ content: 'border border-[#2a2a2a] bg-[#171717] p-2' }"
      >
        <UButton
          color="neutral"
          variant="ghost"
          square
          class="size-9 justify-center rounded-full p-0"
          :aria-label="org.name"
        >
          <NuxtImg
            :src="communityLogoSrc(org.logo, org.name)"
            :alt="org.name"
            width="20"
            height="20"
            class="size-5 rounded-full object-cover"
          />
        </UButton>
        <template #content>
          <div class="flex min-w-44 flex-col gap-1">
            <p class="px-2.5 py-1 text-sm font-medium text-white">
              {{ org.name }}
            </p>
            <NuxtLink
              v-for="link in linksFor(org)"
              :key="link.to"
              :to="link.to"
              class="rounded px-2.5 py-1.5 text-sm font-medium"
              :class="
                isActive(link)
                  ? 'bg-[#232323] text-white'
                  : 'text-[#8b8b8b] hover:text-white'
              "
              @click="onSelect"
            >
              {{ link.label }}
            </NuxtLink>
          </div>
        </template>
      </UPopover>
    </div>

    <div v-else class="flex flex-col gap-2">
      <div v-for="org in orgs" :key="org.slug" class="flex flex-col gap-2">
        <button
          type="button"
          class="flex w-full items-center gap-2.5 rounded px-2.5 py-1.5 text-left"
          :aria-expanded="isExpanded(org.slug)"
          @click="toggle(org.slug)"
          @mouseenter="hoveredSlug = org.slug"
          @mouseleave="hoveredSlug = null"
        >
          <NuxtImg
            :src="communityLogoSrc(org.logo, org.name)"
            :alt="org.name"
            width="20"
            height="20"
            class="size-5 shrink-0 rounded-full object-cover"
          />
          <OverflowMarquee
            class="min-w-0 flex-1 text-sm font-medium text-white"
            :text="org.name"
            :play="hoveredSlug === org.slug"
          />
          <UIcon
            name="i-lucide-chevron-down"
            class="size-5 shrink-0 text-white transition-transform duration-200"
            :class="isExpanded(org.slug) ? 'rotate-180' : ''"
          />
        </button>

        <div v-if="isExpanded(org.slug)" class="flex items-stretch">
          <div class="ml-2.5 flex w-5 shrink-0 justify-center">
            <div class="h-full w-px bg-[#2a2a2a]" />
          </div>
          <div class="flex min-w-0 flex-1 flex-col gap-2">
            <NuxtLink
              v-for="link in linksFor(org)"
              :key="link.to"
              :to="link.to"
              class="flex h-8 items-center rounded px-2.5 text-sm font-medium"
              :class="
                isActive(link)
                  ? 'bg-[#232323] text-white'
                  : 'text-[#8b8b8b] hover:text-white'
              "
              @click="onSelect"
            >
              {{ link.label }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
