<script setup lang="ts">
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import type { OnboardingInvitationPreview } from '~~/shared/contracts/onboarding';

type InvitationDetails = OnboardingInvitationPreview;

type AcceptResult = {
  organizationSlug: string;
};

const route = useRoute();
const toast = useToast();
const queryClient = useQueryClient();
const isAccepting = ref(false);
const hasAccepted = ref(false);

const invitationId = computed(() => String(route.params.token || ''));

const {
  data: invitation,
  isLoading: pending,
  error,
  refetch: refresh,
} = useQuery({
  queryKey: ['onboarding-invitation', invitationId],
  queryFn: () =>
    $fetch<InvitationDetails>(
      `/api/onboarding-invitations/${invitationId.value}` as string
    ),
  enabled: () => !!invitationId.value,
});

async function onAccept() {
  if (!invitationId.value) return;

  isAccepting.value = true;
  try {
    const accepted = await $fetch<AcceptResult>(
      `/api/onboarding-invitations/${invitationId.value}` as string,
      { method: 'PATCH', body: { status: 'accepted' } }
    );
    hasAccepted.value = true;
    await queryClient.invalidateQueries({
      queryKey: organizationQueryKeys.all,
    });
    toast.add({
      title: 'Invitation accepted',
      description: 'Your workspace is now ready.',
      color: 'success',
    });
    const cardsPath = accepted.organizationSlug
      ? `${ROUTES.PLATFORM.ROOT}/${accepted.organizationSlug}/cards`
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

const meta = computed(() => {
  if (!invitation.value) return [];
  const months = invitation.value.freeMonths;
  const period = months === 1 ? '1 month free' : `${months} months free`;
  return [invitation.value.planName, period];
});

useInAppBrowserPreview(() => {
  if (!invitation.value) return null;
  const { cardFirstName, cardLastName } = invitation.value;
  return {
    heading: 'Claim Your LA PERSONA Card in Your\u00a0Browser',
    item: {
      imageUrl: INVITATION_COVER_FALLBACK,
      title: [cardFirstName, cardLastName].filter(Boolean).join(' '),
      description: meta.value.join(' · '),
    },
  };
});

// Keep the accept state until navigation, so "already processed" never flashes.
const isAcceptInProgress = computed(
  () => isAccepting.value || hasAccepted.value
);

const notice = computed(() => {
  if (!invitation.value || isAcceptInProgress.value) return '';
  if (invitation.value.isExpired) return 'This invitation is expired.';
  if (invitation.value.status !== 'pending') {
    return 'This invitation has already been processed.';
  }
  if (invitation.value.isEmailMatched === false) {
    return 'This invitation belongs to a different email account.';
  }
  return '';
});

const noticeColor = computed(() => {
  if (!invitation.value) return 'neutral' as const;
  if (invitation.value.isExpired) return 'warning' as const;
  if (invitation.value.isEmailMatched === false) return 'error' as const;
  return 'neutral' as const;
});

const errorMessage = computed(() => {
  const acceptError = error.value as {
    data?: { statusMessage?: string };
    message?: string;
  } | null;
  return (
    acceptError?.data?.statusMessage ||
    acceptError?.message ||
    'This invitation does not exist or is no longer available.'
  );
});
</script>

<template>
  <UiInvitationScreen
    :pending="pending"
    :error-title="error || !invitation ? 'Invitation not found' : undefined"
    :error-message="error || !invitation ? errorMessage : undefined"
    :cover-src="INVITATION_COVER_FALLBACK"
    cover-aspect-class="aspect-[1/0.583]"
    :organization-name="invitation?.organizationName"
    :meta="meta"
    :notice="notice"
    :notice-color="noticeColor"
    action-label="Accept Invitation"
    :action-loading="isAcceptInProgress"
    :action-disabled="!isAcceptInProgress && !invitation?.canAccept"
    @action="onAccept"
    @retry="() => void refresh()"
  />
</template>
