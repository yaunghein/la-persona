<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui';
import { ORGANIZATION_TYPES } from '~~/shared/utils/constants';

const route = useRoute();
const toast = useToast();

const open = ref(false);
const orgSlug = computed(() => String(route.params.orgSlug || ''));

const { data: userOrgs } = useUserOrganizations();

const personalOrg = computed(() =>
  (userOrgs.value || []).find((org) => org.type === ORGANIZATION_TYPES.PERSONAL)
);

const communityOrgs = computed(() =>
  (userOrgs.value || []).filter(
    (org) => org.type === ORGANIZATION_TYPES.COMMUNITY
  )
);

const routeOrg = computed(() =>
  (userOrgs.value || []).find((org) => org.slug === orgSlug.value)
);

const personalBasePath = computed(() =>
  personalOrg.value
    ? `${ROUTES.PLATFORM.ROOT}/${personalOrg.value.slug}`
    : orgSlug.value
      ? `${ROUTES.PLATFORM.ROOT}/${orgSlug.value}`
      : ROUTES.PLATFORM.ROOT
);

function closeSidebar() {
  open.value = false;
}

function communityLinksFor(org: (typeof communityOrgs.value)[number]) {
  const base = `${ROUTES.PLATFORM.ROOT}/${org.slug}`;
  if (isCommunityMemberOnlyOrg(org)) {
    return [
      { label: 'Events', to: `${base}/events` },
      { label: 'About', to: `${base}/about` },
    ];
  }

  return [
    { label: 'Insights', to: base },
    { label: 'Members', to: `${base}/members` },
    { label: 'Events', to: `${base}/events` },
    { label: 'Settings', to: `${base}/settings` },
  ];
}

const personalLinks = computed(
  () =>
    [
      {
        label: 'Activities',
        icon: 'i-gg:insights',
        to: personalBasePath.value,
        exact: true,
        onSelect: closeSidebar,
      },
      {
        label: 'Cards',
        icon: 'i-material-symbols:cards-stack-outline-sharp',
        to: `${personalBasePath.value}/cards`,
        onSelect: closeSidebar,
      },
      {
        label: 'Contacts',
        icon: 'i-material-symbols:perm-contact-calendar-sharp',
        to: `${personalBasePath.value}/contacts`,
        onSelect: closeSidebar,
      },
      // {
      //   label: 'Team (Coming Soon)',
      //   icon: 'i-ri:team-line',
      //   to: `${personalBasePath.value}/teams`,
      //   onSelect: closeSidebar,
      // },
    ] satisfies NavigationMenuItem[]
);

const groups = computed(() => [
  {
    id: 'links',
    label: 'Go to',
    items: [
      ...personalLinks.value,
      ...communityOrgs.value.flatMap((org) =>
        communityLinksFor(org).map((item) => ({
          label: `${org.name} · ${item.label}`,
          to: item.to,
          onSelect: closeSidebar,
        }))
      ),
    ],
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

import type { FeedbackKind } from '~~/shared/types/feedback';
import { FEEDBACK_KIND_LABELS } from '~~/shared/types/feedback';

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
  const slug = String(route.params.orgSlug || '');
  if (!slug) return path === ROUTES.PLATFORM.ROOT ? 'Insights' : '';

  const basePath = `${ROUTES.PLATFORM.ROOT}/${slug}`;
  if (path === basePath) {
    return routeOrg.value?.type === ORGANIZATION_TYPES.COMMUNITY
      ? 'Insights'
      : 'Dashboard';
  }
  if (path.startsWith(`${basePath}/cards`)) return 'Cards';
  if (path.startsWith(`${basePath}/contacts`)) return 'Contacts';
  if (path.startsWith(`${basePath}/billing`)) return 'Billing';
  if (path.startsWith(`${basePath}/teams`)) return 'Teams';
  if (path.startsWith(`${basePath}/members`)) return 'Members';
  if (path.startsWith(`${basePath}/events`)) return 'Events';
  if (path.startsWith(`${basePath}/about`)) return 'About';
  if (path.startsWith(`${basePath}/settings`)) return 'Settings';

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
        <div class="flex flex-col gap-8 py-4">
          <UNavigationMenu
            :collapsed="collapsed"
            :items="personalLinks"
            orientation="vertical"
            tooltip
            popover
            :class="
              collapsed
                ? '[&_ul]:flex [&_ul]:flex-col [&_ul]:items-center [&_ul]:gap-2 [&_a]:size-9 [&_a]:justify-center [&_a]:px-0 [&_a]:py-0 [&_a]:font-medium [&_a]:before:inset-0'
                : '[&_ul]:flex [&_ul]:flex-col [&_ul]:gap-2 [&_a]:px-2.5 [&_a]:py-1.5 [&_a]:font-medium'
            "
          />

          <PlatformCommunityNav
            :orgs="communityOrgs"
            :collapsed="collapsed"
            @select="closeSidebar"
          />
        </div>

        <div class="mt-auto">
          <HelpFeedbackMenu
            :collapsed="collapsed"
            @open-feedback="openFeedbackSlideover"
          />
        </div>
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
          class="uppercase text-sm tracking-[1.4px] border-b border-[#232323] bg-[#171717]"
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

    <USlideover
      v-model:open="isFeedbackSlideoverOpen"
      side="right"
      inset
      :title="feedbackHeaderLabel"
      :ui="{
        content: 'bg-[#171717]',
        title: 'text-sm font-medium tracking-[1.4px] text-white uppercase',
      }"
    >
      <template #body>
        <FormFeedbackSubmission
          :kind="feedbackKind"
          @close="isFeedbackSlideoverOpen = false"
        />
      </template>
    </USlideover>
  </UDashboardGroup>
</template>
