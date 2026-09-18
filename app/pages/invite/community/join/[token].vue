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
          Invite unavailable
        </h1>
        <p class="text-sm text-[#8b8b8b]">{{ errorMessage }}</p>
        <UButton
          label="Try again"
          color="neutral"
          class="rounded-full bg-white px-5 font-medium text-dark"
          @click="() => refetch()"
        />
      </div>

      <div v-else-if="data" class="space-y-6">
        <UAvatar
          :src="data.logoUrl || undefined"
          :alt="data.organizationName"
          icon="i-lucide-users"
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
            {{
              data.alreadyMember
                ? 'You are already a member of this community.'
                : 'Join this community to get your community persona card.'
            }}
          </p>
        </div>
        <UButton
          :label="data.alreadyMember ? 'Open community' : 'Join community'"
          color="neutral"
          :loading="isJoining"
          class="h-10 rounded-full bg-white px-6 font-medium text-dark hover:bg-white/90"
          @click="() => join()"
        />
      </div>
    </div>
  </UContainer>
</template>
