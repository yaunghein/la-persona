<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query';

type InvitationDetails = {
  id: string;
  email: string;
  status: string;
  freeMonths: number;
  expiresAt: string;
  acceptedAt: string | null;
  organizationName: string;
  organizationSlug: string;
  cardSlug: string;
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
  isLoading: pending,
  error,
  refetch: refresh,
} = useQuery({
  queryKey: ['onboarding-invitation', invitationId],
  queryFn: () =>
    $fetch<InvitationDetails>(
      `/api/onboarding-invitation/${invitationId.value}`
    ),
  enabled: () => !!invitationId.value,
});

async function onAccept() {
  if (!invitationId.value) return;

  isAccepting.value = true;
  try {
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
    const orgSlug = invitation.value?.organizationSlug;
    const cardsPath = orgSlug
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

const meta = computed(() => {
  if (!invitation.value) return [];
  const months = invitation.value.freeMonths;
  const period = months === 1 ? '1 month free' : `${months} months free`;
  return [invitation.value.planName, period];
});

const notice = computed(() => {
  if (!invitation.value) return '';
  if (invitation.value.isExpired) return 'This invitation is expired.';
  if (invitation.value.status !== 'pending') {
    return 'This invitation has already been processed.';
  }
  if (invitation.value.isEmailMatched === false) {
    return 'This invitation belongs to a different email account.';
  }
  if (hasAccepted.value) return 'Invitation accepted successfully.';
  return '';
});

const noticeColor = computed(() => {
  if (!invitation.value) return 'neutral' as const;
  if (invitation.value.isExpired) return 'warning' as const;
  if (invitation.value.isEmailMatched === false) return 'error' as const;
  if (hasAccepted.value) return 'success' as const;
  return 'neutral' as const;
});

const errorMessage = computed(() => {
  const acceptError = error.value as
    | { data?: { statusMessage?: string }; message?: string }
    | null;
  return (
    acceptError?.data?.statusMessage ||
    acceptError?.message ||
    'This invitation does not exist or is no longer available.'
  );
});
</script>

<template>
  <InviteInvitationScreen
    :pending="pending"
    :error-title="error || !invitation ? 'Invitation not found' : undefined"
    :error-message="error || !invitation ? errorMessage : undefined"
    :cover-src="INVITATION_COVER_FALLBACK"
    :logo-src="INVITATION_LOGO_FALLBACK"
    :organization-name="invitation?.organizationName"
    :meta="meta"
    :notice="notice"
    :notice-color="noticeColor"
    action-label="Accept Invitation"
    :action-loading="isAccepting"
    :action-disabled="!invitation?.canAccept"
    @action="onAccept"
    @retry="() => void refresh()"
  />
</template>
