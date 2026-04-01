<script setup lang="ts">
definePageMeta({
  layout: 'platform',
});

type InvitationDetails = {
  id: string;
  email: string;
  status: string;
  freeMonths: number;
  expiresAt: string;
  acceptedAt: string | null;
  organizationName: string;
  organizationSlug: string;
  cardFirstName: string;
  cardLastName: string | null;
  planName: string;
  isExpired: boolean;
  canAccept: boolean;
  isEmailMatched: boolean | null;
};

const route = useRoute();
const toast = useToast();
const isAccepting = ref(false);
const hasAccepted = ref(false);

const invitationId = computed(() => String(route.params.id || ''));

const {
  data: invitation,
  pending,
  error,
  refresh,
} = await useFetch<InvitationDetails>(
  () => `/api/onboarding-invitation/${invitationId.value}`,
  { watch: [invitationId] }
);

async function onAccept() {
  if (!invitationId.value) return;

  isAccepting.value = true;
  try {
    const orgSlug = invitation.value?.organizationSlug;
    await $fetch(`/api/onboarding-invitation/${invitationId.value}/accept`, {
      method: 'POST',
    });
    hasAccepted.value = true;
    await refresh();
    toast.add({
      title: 'Invitation accepted',
      description: 'Your workspace is now ready.',
      color: 'success',
    });
    const cardsPath =
      orgSlug && orgSlug.length > 0
        ? `${ROUTES.PLATFORM.ROOT}/${orgSlug}/cards`
        : ROUTES.PLATFORM.ROOT;
    await navigateTo(cardsPath);
  } catch (acceptError: any) {
    toast.add({
      title: 'Accept failed',
      description:
        acceptError?.data?.statusMessage ||
        acceptError?.statusMessage ||
        'Please try again.',
      color: 'error',
    });
    await refresh();
  } finally {
    isAccepting.value = false;
  }
}
</script>

<template>
  <section
    class="mx-auto flex min-h-[calc(100dvh-7rem)] w-full max-w-3xl items-center px-5 py-12"
  >
    <UCard
      class="w-full"
      :ui="{
        root: 'rounded-[8px] border border-[#232323] bg-[#171717]',
        body: 'p-8',
      }"
    >
      <div v-if="pending" class="space-y-3">
        <USkeleton class="h-8 w-44" />
        <USkeleton class="h-5 w-full" />
        <USkeleton class="h-5 w-3/4" />
      </div>

      <div v-else-if="error || !invitation" class="space-y-4">
        <h1 class="text-2xl font-medium uppercase tracking-widest text-white">
          Invitation not found
        </h1>
        <p class="text-sm text-muted">
          This invitation does not exist or is no longer available.
        </p>
      </div>

      <div v-else class="space-y-6">
        <div class="space-y-2">
          <h1 class="text-2xl font-medium uppercase tracking-widest text-white">
            You are invited
          </h1>
          <p class="text-sm text-muted">
            Join
            <span class="text-white">{{ invitation.organizationName }}</span>
            with card
            <span class="text-white">
              {{
                `${invitation.cardFirstName} ${invitation.cardLastName || ''}`.trim()
              }}
            </span>
            on
            <span class="text-white">{{ invitation.planName }}</span
            >.
          </p>
          <p class="text-sm text-muted">
            Free period:
            <span class="text-white">{{ invitation.freeMonths }}</span> month(s)
          </p>
        </div>

        <UAlert
          v-if="invitation.isExpired"
          color="warning"
          variant="soft"
          title="This invitation is expired."
        />
        <UAlert
          v-else-if="invitation.status !== 'pending'"
          color="neutral"
          variant="soft"
          title="This invitation has already been processed."
        />
        <UAlert
          v-else-if="invitation.isEmailMatched === false"
          color="error"
          variant="soft"
          title="This invitation belongs to a different email account."
        />
        <UAlert
          v-else-if="hasAccepted"
          color="success"
          variant="soft"
          title="Invitation accepted successfully."
        />

        <div class="flex flex-wrap items-center justify-between gap-3 pt-2">
          <p class="text-sm text-muted">
            Expires at: {{ new Date(invitation.expiresAt).toLocaleString() }}
          </p>
          <UButton
            size="xl"
            label="Accept Invitation"
            color="neutral"
            class="rounded-full"
            :loading="isAccepting"
            :disabled="!invitation.canAccept || isAccepting"
            @click="onAccept"
          />
        </div>
      </div>
    </UCard>
  </section>
</template>
