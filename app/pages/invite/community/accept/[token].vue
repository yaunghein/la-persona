<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import type {
  CommunityInvitationPreview,
  CommunityJoinResult,
} from '~~/shared/types/community-members';
import { QUERY_KEYS } from '~/utils/query-keys';

useSeoMeta({ ...getSeoTitle('Community invitation - LA PERSONA') });

const route = useRoute();
const queryClient = useQueryClient();
const token = computed(() => String(route.params.token || ''));

const { data, isPending, isError, error, refetch } = useQuery({
  queryKey: computed(() => ['community-invitation', token.value]),
  queryFn: () =>
    $fetch<CommunityInvitationPreview>(
      `/api/community-invitations/${token.value}`
    ),
  enabled: () => !!token.value,
});

const { mutate: accept, isPending: isAccepting } = useMutation({
  mutationFn: () =>
    $fetch<CommunityJoinResult>(
      `/api/community-invitations/${token.value}/accept`,
      { method: 'POST' }
    ),
  onSuccess: async (result) => {
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.organizations });
    await navigateTo(result.redirectTo);
  },
  onError: (err: { data?: { statusMessage?: string }; message?: string }) => {
    useToast().add({
      title: 'Could not accept invitation',
      description: err.data?.statusMessage || err.message || 'Try again.',
      color: 'error',
    });
  },
});

const errorMessage = computed(
  () =>
    (error.value as { data?: { statusMessage?: string }; message?: string })
      ?.data?.statusMessage ||
    (error.value as { message?: string })?.message ||
    'This invitation is invalid.'
);

const canAccept = computed(
  () =>
    data.value &&
    !data.value.alreadyMember &&
    !data.value.expired &&
    data.value.status === 'pending'
);

const meta = computed(() =>
  data.value ? communityInviteMeta(data.value) : []
);

const notice = computed(() => {
  if (!data.value) return '';
  if (data.value.alreadyMember) {
    return 'You are already a member of this community.';
  }
  if (data.value.expired) return 'This invitation has expired.';
  if (data.value.status !== 'pending') {
    return 'This invitation has already been processed.';
  }
  return '';
});

const noticeColor = computed(() => {
  if (data.value?.expired) return 'warning' as const;
  return 'neutral' as const;
});

const actionLabel = computed(() => {
  if (!data.value) return '';
  if (data.value.alreadyMember) return 'Open community';
  if (canAccept.value) return 'Accept Invitation';
  return '';
});

function onAction() {
  if (data.value?.alreadyMember) {
    return navigateTo(
      `${ROUTES.PLATFORM.ROOT}/${data.value.organizationSlug}`
    );
  }
  accept();
}
</script>

<template>
  <InviteInvitationScreen
    :pending="isPending"
    :error-title="isError ? 'Invitation unavailable' : undefined"
    :error-message="isError ? errorMessage : undefined"
    :cover-src="data ? invitationCoverSrc(data.coverUrl) : undefined"
    :logo-src="data ? invitationLogoSrc(data.logoUrl) : undefined"
    :organization-name="data?.organizationName"
    :meta="meta"
    :notice="notice"
    :notice-color="noticeColor"
    :action-label="actionLabel"
    :action-loading="isAccepting"
    @action="onAction"
    @retry="() => void refetch()"
  />
</template>
