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
</script>

<template>
  <UContainer class="flex min-h-dvh items-center justify-center">
    <div class="w-full max-w-md space-y-6 px-6 py-10 text-center">
      <div v-if="isPending" class="flex flex-col items-center gap-3">
        <UIcon
          name="i-lucide-loader-2"
          class="h-8 w-8 animate-spin text-primary"
        />
        <p class="text-sm text-[#8b8b8b]">Loading invitation...</p>
      </div>

      <div v-else-if="isError" class="space-y-4">
        <h1 class="text-xl font-medium uppercase tracking-widest text-white">
          Invitation unavailable
        </h1>
        <p class="text-sm text-[#8b8b8b]">{{ errorMessage }}</p>
        <UButton
          label="Try again"
          color="neutral"
          class="rounded-full bg-white px-5 font-medium text-dark"
          @click="() => void refetch()"
        />
      </div>

      <div v-else-if="data" class="space-y-6">
        <UAvatar
          :src="data.logoUrl || undefined"
          :alt="data.organizationName"
          icon="i-lucide-mail"
          :ui="{
            root: 'mx-auto size-20 bg-[#232323]',
            icon: 'size-8 text-[#8b8b8b]',
          }"
        />
        <div class="space-y-2">
          <h1 class="text-xl font-medium uppercase tracking-widest text-white">
            {{ data.organizationName }}
          </h1>
          <p class="text-sm text-[#8b8b8b]">
            <template v-if="data.alreadyMember">
              You are already a member of this community.
            </template>
            <template v-else-if="data.expired">
              This invitation has expired.
            </template>
            <template v-else>
              This invitation was sent to {{ data.email }}. Accept to join and
              create your community card.
            </template>
          </p>
        </div>
        <UButton
          v-if="data.alreadyMember"
          label="Open community"
          color="neutral"
          :loading="isAccepting"
          class="h-10 rounded-full bg-white px-6 font-medium text-dark hover:bg-white/90"
          @click="() => accept()"
        />
        <UButton
          v-else-if="canAccept"
          label="Accept invitation"
          color="neutral"
          :loading="isAccepting"
          class="h-10 rounded-full bg-white px-6 font-medium text-dark hover:bg-white/90"
          @click="() => accept()"
        />
      </div>
    </div>
  </UContainer>
</template>
