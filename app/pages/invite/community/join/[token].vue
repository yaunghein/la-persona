<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import type {
  CommunityJoinPreview,
  CommunityJoinPublicPreview,
  CommunityJoinResult,
} from '~~/shared/types/community-members';
import { QUERY_KEYS } from '~/utils/query-keys';

const route = useRoute();
const queryClient = useQueryClient();
const token = computed(() => String(route.params.token || ''));

const { data: session } = await authClient.useSession(useFetch);

// Public preview renders on the server so shared links show the community.
const {
  data: preview,
  pending: isPreviewPending,
  error: previewError,
  refresh: refreshPreview,
} = await useFetch<CommunityJoinPublicPreview>(
  () => `/api/public/community-join/${token.value}`
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
    const logo = invitationLogoSrc(preview.value.logoUrl);
    return (
      communityCoverSrc(preview.value.coverUrl) ||
      (logo === INVITATION_LOGO_FALLBACK ? null : logo)
    );
  },
  imageAlt: () => preview.value?.organizationName,
  noindex: true,
});

// Membership needs a session; signed-out visitors only see the public preview.
const {
  data: viewerPreview,
  isPending: isViewerPending,
  isError: isViewerError,
  error: viewerError,
  refetch,
} = useQuery({
  queryKey: computed(() => ['community-join', token.value]),
  queryFn: () =>
    $fetch<CommunityJoinPreview>(`/api/community-join/${token.value}`),
  enabled: () => !!token.value && !!session.value,
});

const data = computed(() => viewerPreview.value ?? preview.value ?? null);
const alreadyMember = computed(() => !!viewerPreview.value?.alreadyMember);
const error = computed(
  () => previewError.value ?? (isViewerError.value ? viewerError.value : null)
);

const { mutate: join, isPending: isJoining } = useMutation({
  mutationFn: () =>
    $fetch<CommunityJoinResult>(`/api/community-join/${token.value}`, {
      method: 'POST',
    }),
  onSuccess: async (result) => {
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.organizations });
    await navigateTo(result.redirectTo);
  },
});

const errorMessage = computed(
  () =>
    (error.value as { data?: { statusMessage?: string }; message?: string })
      ?.data?.statusMessage ||
    (error.value as { message?: string })?.message ||
    'This invite link is invalid.'
);

const meta = computed(() =>
  data.value ? communityInviteMeta(data.value) : []
);

const actionLabel = computed(() => {
  if (!data.value) return '';
  if (!session.value) return 'Sign in to join';
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
  join();
}

function onRetry() {
  void refreshPreview();
  if (session.value) void refetch();
}
</script>

<template>
  <InviteInvitationScreen
    :pending="isPreviewPending"
    :error-title="error ? 'Invite unavailable' : undefined"
    :error-message="error ? errorMessage : undefined"
    :cover-src="data ? invitationCoverSrc(data.coverUrl) : undefined"
    :logo-src="data ? invitationLogoSrc(data.logoUrl) : undefined"
    :organization-name="data?.organizationName"
    :meta="meta"
    :notice="
      alreadyMember ? 'You are already a member of this community.' : undefined
    "
    :action-label="actionLabel"
    :action-loading="isJoining"
    :action-disabled="!!session && isViewerPending"
    @action="onAction"
    @retry="onRetry"
  />
</template>
