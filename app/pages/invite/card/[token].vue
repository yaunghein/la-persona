<script setup lang="ts">
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { QUERY_KEYS } from '~/utils/query-keys';

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
      `/api/onboarding-invitation/${invitationId.value}`
    ),
  enabled: () => !!invitationId.value,
});

async function onAccept() {
  if (!invitationId.value) return;

  isAccepting.value = true;
  try {
    const accepted = await $fetch<AcceptResult>(
      `/api/onboarding-invitation/${invitationId.value}/accept`,
      { method: 'POST' }
    );
    hasAccepted.value = true;
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.organizations });
    await refresh();
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
    cover-aspect-class="aspect-[1/0.583]"
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
