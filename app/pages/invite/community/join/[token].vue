<script setup lang="ts">
import type { JoinLinkPreview } from '~~/shared/contracts/organization';

const route = useRoute();
const token = computed(() => String(route.params.token || ''));

const { data: session } = await authClient.useSession(useFetch);

// Public preview renders on the server so shared links show the community.
const {
  data: preview,
  pending: isPreviewPending,
  error: previewError,
  refresh: refreshPreview,
} = await useFetch<JoinLinkPreview>(
  () => `/api/public/join-links/${token.value}`
);

usePageSeo({
  title: () =>
    preview.value
      ? `Join ${preview.value.organizationName} on LA PERSONA`
      : 'Join community - LA PERSONA',
  description: () => {
    if (!preview.value) return null;
    const { memberCount, eventCount } = preview.value;
    const members = `${memberCount.toLocaleString()} ${memberCount === 1 ? 'member' : 'members'}`;
    const events = `${eventCount.toLocaleString()} ${eventCount === 1 ? 'event' : 'events'} hosted`;
    return `${members} · ${events}. Join the community on LA PERSONA.`;
  },
  image: () => {
    if (!preview.value) return null;
    return (
      communityCoverSrc(preview.value.coverUrl) ||
      invitationLogoSrc(preview.value.logoUrl) ||
      null
    );
  },
  imageAlt: () => preview.value?.organizationName,
  noindex: true,
});

const data = computed(() => preview.value ?? null);
const alreadyMember = computed(() => !!preview.value?.alreadyMember);
const error = computed(() => previewError.value);

const {
  mutate: join,
  isPending: isJoining,
  isSuccess: isJoined,
} = useJoinCommunityMutation(token);
// Keep the join state until navigation, so "already a member" never flashes.
const isJoinInProgress = computed(() => isJoining.value || isJoined.value);

function joinCommunity() {
  join(undefined, {
    onSuccess: (result) => navigateTo(result.redirectTo),
  });
}

const errorMessage = computed(() =>
  apiErrorMessage(error.value, 'This invite link is invalid or has expired.')
);

const meta = computed(() =>
  data.value ? communityInviteMeta(data.value) : []
);

const actionLabel = computed(() => {
  if (!data.value) return '';
  if (!session.value) return 'Sign in to join';
  if (isJoinInProgress.value) return 'Join community';
  return alreadyMember.value ? 'Open community' : 'Join community';
});

function onAction() {
  if (!session.value) {
    return navigateTo({
      path: ROUTES.SIGN_IN,
      query: { redirectTo: route.fullPath },
    });
  }
  if (alreadyMember.value && data.value) {
    return navigateTo(`${ROUTES.PLATFORM.ROOT}/${data.value.organizationSlug}`);
  }
  joinCommunity();
}

function onRetry() {
  void refreshPreview();
}
</script>

<template>
  <UiInvitationScreen
    :pending="isPreviewPending"
    :error-title="error ? 'Invite unavailable' : undefined"
    :error-message="error ? errorMessage : undefined"
    :cover-src="data ? invitationCoverSrc(data.coverUrl) : undefined"
    :logo-src="data ? invitationLogoSrc(data.logoUrl) : undefined"
    :organization-name="data?.organizationName"
    :meta="meta"
    :notice="
      alreadyMember && !isJoinInProgress
        ? 'You are already a member of this community.'
        : undefined
    "
    :action-label="actionLabel"
    :action-loading="isJoinInProgress"
    @action="onAction"
    @retry="onRetry"
  />
</template>
