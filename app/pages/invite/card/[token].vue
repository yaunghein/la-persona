<script setup lang="ts">
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import type { OnboardingInvitationPreview } from '~~/shared/contracts/onboarding';

type InvitationDetails = OnboardingInvitationPreview;

type AcceptResult = {
  organizationSlug: string;
  cardSlug: string;
  needsSetup: boolean;
};

const route = useRoute();
const toast = useToast();
const queryClient = useQueryClient();
const { data: session } = await authClient.useSession(useFetch);
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
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: organizationQueryKeys.all }),
      queryClient.invalidateQueries({ queryKey: cardQueryKeys.all }),
    ]);
    toast.add({
      title: 'Invitation accepted',
      description: 'Your workspace is now ready.',
      color: 'success',
    });
    const slug = accepted.organizationSlug;
    const dest = !slug
      ? ROUTES.PLATFORM.ROOT
      : accepted.needsSetup
        ? `${ROUTES.PLATFORM.ROOT}/${slug}/cards/${accepted.cardSlug}/setup`
        : `${ROUTES.PLATFORM.ROOT}/${slug}/cards`;
    await navigateTo(dest);
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
      description: meta.value.join(' • '),
    },
  };
});

// Keep the accept state until navigation, so "already processed" never flashes.
const isAcceptInProgress = computed(
  () => isAccepting.value || hasAccepted.value
);

const isOtherAccount = computed(
  () => apiErrorCode(error.value) === 'not_invitee'
);

const notice = computed(() => {
  if (!invitation.value || isAcceptInProgress.value) return '';
  if (invitation.value.isExpired) return 'This invitation is expired.';
  if (invitation.value.status !== 'pending') {
    return 'This invitation has already been processed.';
  }
  return '';
});

const noticeColor = computed(() => {
  if (invitation.value?.isExpired) return 'warning' as const;
  return 'neutral' as const;
});

const errorTitle = computed(() => {
  if (invitation.value && !error.value) return undefined;
  return isOtherAccount.value
    ? 'Signed in with another account'
    : 'Invitation not found';
});

const errorMessage = computed(() => {
  const message = apiErrorMessage(
    error.value,
    'This invitation does not exist or is no longer available.'
  );
  const viewerEmail = session.value?.user.email;
  return isOtherAccount.value && viewerEmail
    ? `${message} You're signed in as ${viewerEmail}.`
    : message;
});

function onRetry() {
  if (isOtherAccount.value) return signOut();
  void refresh();
}
</script>

<template>
  <UiInvitationScreen
    :pending="pending"
    :error-title="errorTitle"
    :error-message="errorTitle ? errorMessage : undefined"
    :retry-label="isOtherAccount ? 'Sign out & switch account' : undefined"
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
    @retry="onRetry"
  />
</template>
