<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import type {
  CommunityJoinPreview,
  CommunityJoinResult,
} from '~~/shared/types/community-members';
import { QUERY_KEYS } from '~/utils/query-keys';

useSeoMeta({ ...getSeoTitle('Join community - LA PERSONA') });

const route = useRoute();
const queryClient = useQueryClient();
const token = computed(() => String(route.params.token || ''));

const { data, isPending, isError, error, refetch } = useQuery({
  queryKey: computed(() => ['community-join', token.value]),
  queryFn: () =>
    $fetch<CommunityJoinPreview>(`/api/community-join/${token.value}`),
  enabled: () => !!token.value,
});

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

function onAction() {
  if (data.value?.alreadyMember) {
    return navigateTo(
      `${ROUTES.PLATFORM.ROOT}/${data.value.organizationSlug}`
    );
  }
  join();
}
</script>

<template>
  <InviteInvitationScreen
    :pending="isPending"
    :error-title="isError ? 'Invite unavailable' : undefined"
    :error-message="isError ? errorMessage : undefined"
    :cover-src="data ? invitationCoverSrc(data.coverUrl) : undefined"
    :logo-src="data ? invitationLogoSrc(data.logoUrl) : undefined"
    :organization-name="data?.organizationName"
    :meta="meta"
    :notice="
      data?.alreadyMember
        ? 'You are already a member of this community.'
        : undefined
    "
    :action-label="
      data ? (data.alreadyMember ? 'Open community' : 'Join community') : ''
    "
    :action-loading="isJoining"
    @action="onAction"
    @retry="() => void refetch()"
  />
</template>
