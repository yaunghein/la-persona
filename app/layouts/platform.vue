<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui';
import {
  ORGANIZATION_TYPES,
  type OrganizationType,
} from '~~/shared/utils/constants';

type UserOrganization = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  type: OrganizationType;
};

const route = useRoute();
const toast = useToast();
const router = useRouter();

const open = ref(false);
const orgSlug = computed(() => String(route.params.orgSlug || ''));

const { data: userOrgs } = await useFetch<UserOrganization[]>(
  '/api/organizations',
  { default: () => [] }
);

const personalOrg = computed(() =>
  (userOrgs.value || []).find((org) => org.type === ORGANIZATION_TYPES.PERSONAL)
);

const communityOrgs = computed(() =>
  (userOrgs.value || []).filter(
    (org) => org.type === ORGANIZATION_TYPES.COMMUNITY
  )
);

const selectedCommunitySlug = useState<string | undefined>(
  'platform-selected-community-slug',
  () => undefined
);

const routeOrg = computed(() =>
  (userOrgs.value || []).find((org) => org.slug === orgSlug.value)
);

watch(
  [communityOrgs, routeOrg],
  () => {
    const routeCommunity =
      routeOrg.value?.type === ORGANIZATION_TYPES.COMMUNITY
        ? routeOrg.value
        : null;

    if (routeCommunity) {
      selectedCommunitySlug.value = routeCommunity.slug;
      return;
    }

    if (
      selectedCommunitySlug.value &&
      communityOrgs.value.some(
        (org) => org.slug === selectedCommunitySlug.value
      )
    ) {
      return;
    }

    selectedCommunitySlug.value = communityOrgs.value[0]?.slug ?? undefined;
  },
  { immediate: true }
);

const personalBasePath = computed(() =>
  personalOrg.value
    ? `${ROUTES.PLATFORM.ROOT}/${personalOrg.value.slug}`
    : orgSlug.value
      ? `${ROUTES.PLATFORM.ROOT}/${orgSlug.value}`
      : ROUTES.PLATFORM.ROOT
);

const communitiesBasePath = computed(() =>
  selectedCommunitySlug.value
    ? `${ROUTES.PLATFORM.ROOT}/${selectedCommunitySlug.value}`
    : null
);

const communityItems = computed(() =>
  communityOrgs.value.map((org) => ({
    label: org.name,
    value: org.slug,
  }))
);

async function onSelectCommunity(slug: unknown) {
  if (typeof slug !== 'string' || !slug) return;
  selectedCommunitySlug.value = slug;
  open.value = false;
  await router.push(`${ROUTES.PLATFORM.ROOT}/${slug}`);
}

function closeSidebar() {
  open.value = false;
}

const personalLinks = computed(
  () =>
    [
      {
        label: 'Insights',
        icon: 'i-gg:insights',
        to: personalBasePath.value,
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
      {
        label: 'Teams (Coming Soon)',
        icon: 'i-ri:team-line',
        to: `${personalBasePath.value}/teams`,
        onSelect: closeSidebar,
      },
    ] satisfies NavigationMenuItem[]
);

const communitiesLinks = computed(
  () =>
    [
      {
        label: 'Insights',
        icon: 'i-gg:insights',
        to: communitiesBasePath.value || undefined,
        disabled: !communitiesBasePath.value,
        onSelect: closeSidebar,
      },
      {
        label: 'Members',
        icon: 'i-ri:team-line',
        to: communitiesBasePath.value
          ? `${communitiesBasePath.value}/members`
          : undefined,
        disabled: !communitiesBasePath.value,
        onSelect: closeSidebar,
      },
      {
        label: 'Events',
        icon: 'i-lucide-calendar',
        to: communitiesBasePath.value
          ? `${communitiesBasePath.value}/events`
          : undefined,
        disabled: !communitiesBasePath.value,
        onSelect: closeSidebar,
      },
      {
        label: 'Settings',
        icon: 'i-lucide-settings',
        to: communitiesBasePath.value
          ? `${communitiesBasePath.value}/settings`
          : undefined,
        disabled: !communitiesBasePath.value,
        onSelect: closeSidebar,
      },
    ] satisfies NavigationMenuItem[]
);

const groups = computed(() => [
  {
    id: 'links',
    label: 'Go to',
    items: [...personalLinks.value, ...communitiesLinks.value],
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
  if (path === basePath) return 'Insights';
  if (path.startsWith(`${basePath}/cards`)) return 'Cards';
  if (path.startsWith(`${basePath}/contacts`)) return 'Contacts';
  if (path.startsWith(`${basePath}/billing`)) return 'Billing';
  if (path.startsWith(`${basePath}/teams`)) return 'Teams';
  if (path.startsWith(`${basePath}/members`)) return 'Members';
  if (path.startsWith(`${basePath}/events`)) return 'Events';
  if (path.startsWith(`${basePath}/settings`)) return 'Settings';

  return '';
});

const sectionHeadingClass =
  'px-2 text-sm font-medium uppercase tracking-[1.4px] text-white';

const sidebarSelectUi = {
  base: 'h-9 w-full rounded-[4px] border-[#2a2a2a] bg-[#232323] px-3 text-sm text-white',
  content: 'border border-[#2a2a2a] bg-[#232323]',
  item: 'text-white data-[highlighted]:bg-[#2a2a2a]',
  value: 'text-white',
  placeholder: 'text-[#8b8b8b]',
};
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
        <div class="flex flex-col gap-10 py-4">
          <div class="flex flex-col gap-4">
            <p v-if="!collapsed" :class="sectionHeadingClass">Personal</p>
            <UNavigationMenu
              :collapsed="collapsed"
              :items="personalLinks"
              orientation="vertical"
              tooltip
              popover
              class="[&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1 [&_a]:py-2 [&_a]:font-semibold"
            />
          </div>

          <div class="flex flex-col gap-4">
            <p v-if="!collapsed" :class="sectionHeadingClass">Communities</p>
            <USelect
              v-if="!collapsed"
              :model-value="selectedCommunitySlug"
              :items="communityItems"
              placeholder="Select community"
              color="neutral"
              :disabled="communityItems.length === 0"
              :ui="sidebarSelectUi"
              @update:model-value="onSelectCommunity"
            />
            <UNavigationMenu
              v-if="communityItems.length > 0"
              :collapsed="collapsed"
              :items="communitiesLinks"
              orientation="vertical"
              tooltip
              popover
              class="[&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1 [&_a]:py-2 [&_a]:font-semibold"
            />
            <p v-else-if="!collapsed" class="px-2 text-sm text-[#8b8b8b]">
              No communities yet
            </p>
          </div>
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
