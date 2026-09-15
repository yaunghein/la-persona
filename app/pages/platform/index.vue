<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query';
import { getSafeInternalPath } from '~~/shared/utils/safe-redirect';
import { ORGANIZATION_TYPES } from '~~/shared/utils/constants';

const router = useRouter();
const route = useRoute();
const { data: session } = await authClient.useSession(useFetch);

const redirectTo = computed(() => getSafeInternalPath(route.query.redirectTo));

const {
  data: userOrgs,
  isError: isOrgsError,
  isPending: isOrgsPending,
} = useUserOrganizations();

const pendingInvitationId = ref<string | null>(null);
const isResolvingInvite = ref(false);
const inviteLookupStarted = ref(false);
const hasRouted = ref(false);

watch(
  [session, userOrgs, isOrgsPending, isOrgsError],
  async () => {
    if (
      isOrgsPending.value ||
      isResolvingInvite.value ||
      inviteLookupStarted.value
    ) {
      return;
    }
    if (!session.value || isOrgsError.value) return;
    if ((userOrgs.value || []).length) return;

    inviteLookupStarted.value = true;
    isResolvingInvite.value = true;
    try {
      const pending = await $fetch<{ id: string } | null>(
        '/api/onboarding-invitation/pending'
      );
      if (pending?.id) {
        pendingInvitationId.value = pending.id;
        hasRouted.value = true;
        await navigateTo(`${ROUTES.PLATFORM.ROOT}/invitations/${pending.id}`);
      }
    } catch {
      // Fall through to the unavailable state if lookup fails.
    } finally {
      isResolvingInvite.value = false;
    }
  },
  { immediate: true }
);

const workspaceOrg = computed(() => {
  const orgs = userOrgs.value || [];
  return (
    orgs.find((org) => org.type === ORGANIZATION_TYPES.PERSONAL) ||
    orgs[0] ||
    null
  );
});

const orgSlug = computed(() => workspaceOrg.value?.slug || '');

const {
  data: cards,
  isError: isCardsError,
  isPending,
} = useQuery({
  queryKey: ['cards', orgSlug],
  queryFn: () =>
    $fetch('/api/cards', {
      query: { organizationSlug: orgSlug.value },
    }),
  enabled: () => !!orgSlug.value,
});

/** True when the watcher could not route yet and there is no redirect escape hatch. */
const syncStuck = ref(false);
const isError = computed(() => isOrgsError.value || isCardsError.value);

watch(
  [cards, orgSlug, redirectTo],
  () => {
    if (hasRouted.value) return;

    const newCards = cards.value;
    const slug = orgSlug.value;
    const target = redirectTo.value;

    if (target) {
      hasRouted.value = true;
      syncStuck.value = false;
      router.replace(target);
      return;
    }

    if (!slug) {
      syncStuck.value = !isOrgsPending.value;
      return;
    }

    if (newCards == null) {
      syncStuck.value = !isPending.value;
      return;
    }

    syncStuck.value = false;

    let dest = `/platform/${slug}`;
    if (newCards.length === 1) {
      const card = newCards[0];
      if (
        card &&
        (!card.socials || card.socials.length === 0) &&
        card.website == null
      ) {
        dest = `/platform/${slug}/cards/${card.slug}/setup`;
      }
    }

    if (route.path === dest) return;

    hasRouted.value = true;
    router.replace(dest);
  },
  { immediate: true }
);

const showLoading = computed(() => {
  if (hasRouted.value) return true;
  if (redirectTo.value) return true;
  if (!session?.value) return true;
  if (isOrgsPending.value) return true;
  if (isResolvingInvite.value || pendingInvitationId.value) return true;
  if (!orgSlug.value) return false;
  if (isError.value) return false;
  return isPending.value;
});

const showSupportState = computed(() => {
  if (hasRouted.value) return false;
  if (redirectTo.value) return false;
  if (!session?.value) return false;
  if (isResolvingInvite.value || pendingInvitationId.value) return false;
  if (isError.value) return true;
  if (!orgSlug.value) return true;
  return syncStuck.value && !isPending.value;
});
</script>

<template>
  <div class="flex h-dvh items-center justify-center">
    <div v-if="showLoading" class="flex flex-col items-center gap-3">
      <UIcon
        name="i-lucide-loader-2"
        class="h-8 w-8 animate-spin text-primary"
      />
      <p class="animate-pulse text-sm text-gray-500">
        Syncing your workspace...
      </p>
    </div>

    <UContainer
      v-else-if="showSupportState"
      class="min-h-96 h-[calc(100dvh-4rem)]"
    >
      <div class="flex h-full flex-col items-center justify-center text-center">
        <div
          class="flex aspect-square w-11 items-center justify-center rounded-sm bg-[#232323]"
        >
          <UIcon
            name="i-material-symbols:cards-stack-outline-sharp"
            class="h-5 w-5"
          />
        </div>
        <h2 class="mb-4 mt-8 text-sm font-semibold uppercase tracking-[1.4px]">
          {{
            isError ? 'Could not load your workspace' : 'Workspace unavailable'
          }}
        </h2>
        <p class="max-w-sm text-sm leading-relaxed text-muted">
          <template v-if="isError">
            We could not load your cards. Try refreshing the page. If this keeps
            happening, contact
            <span class="text-white">La Persona</span>
            support.
          </template>
          <template v-else-if="!orgSlug">
            No organization is linked to your account yet. If you were invited
            to join a workspace, try the invitation link again or contact
            <span class="text-white">La Persona</span>
            for help.
          </template>
          <template v-else>
            Something went wrong while opening your workspace. Please contact
            <span class="text-white">La Persona</span>
            support and we will help you get back on track.
          </template>
        </p>
      </div>
    </UContainer>

    <div v-else class="flex flex-col items-center gap-3">
      <UIcon
        name="i-lucide-loader-2"
        class="h-8 w-8 animate-spin text-primary"
      />
      <p class="text-sm text-gray-500">Preparing your workspace...</p>
    </div>
  </div>
</template>
