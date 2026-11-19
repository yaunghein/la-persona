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
const { data: organizations, isSuccess: hasLoadedOrganizations } =
  useUserOrganizations();

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
const isMissing = computed(() => apiErrorStatus(error.value) === 404);

const isClaimed = computed(() => invitation.value?.status === 'accepted');
const isCancelled = computed(
  () =>
    invitation.value?.status === 'cancelled' ||
    invitation.value?.status === 'canceled'
);
const hasWorkspace = computed(() => (organizations.value?.length ?? 0) > 0);

const notice = computed(() => {
  if (!invitation.value || isAcceptInProgress.value) return '';
  if (isClaimed.value) return 'This card is already\u00a0claimed.';
  if (isCancelled.value) return 'This invitation was\u00a0cancelled.';
  if (invitation.value.isExpired) return 'This invitation has\u00a0expired.';
  if (invitation.value.status !== 'pending') {
    return 'This invitation has already been processed.';
  }
  return '';
});

const noticeColor = computed(() => {
  if (invitation.value?.isExpired) return 'warning' as const;
  return 'neutral' as const;
});

const isLoadFailure = computed(
  () => !!error.value && !isOtherAccount.value && !isMissing.value
);

const errorTitle = computed(() => {
  if (invitation.value && !error.value) return undefined;
  if (isOtherAccount.value) return 'Signed in with another account';
  if (isLoadFailure.value) return "Couldn't load this invitation";
  return 'Invitation not found';
});

const errorMessage = computed(() => {
  if (isLoadFailure.value) {
    return 'Something went wrong. Try again in a\u00a0moment.';
  }
  const message = apiErrorMessage(
    error.value,
    'This invitation does not exist or is no longer available.'
  );
  const viewerEmail = session.value?.user.email;
  return isOtherAccount.value && viewerEmail
    ? `${message} You're signed in as ${viewerEmail}.`
    : message;
});

// An expired invite is where someone with no workspace lands. A cards link
// would open /platform, which brings them straight back.
const isStrandedExpiredInvite = computed(() => {
  const invite = invitation.value;
  return (
    !!invite &&
    !isAcceptInProgress.value &&
    invite.status === 'pending' &&
    invite.isExpired &&
    !hasWorkspace.value
  );
});

const showExpiredSupport = computed(
  () => isStrandedExpiredInvite.value && hasLoadedOrganizations.value
);

const actionLabel = computed(() => {
  const invite = invitation.value;
  if (!invite) return '';
  if (isAcceptInProgress.value || invite.canAccept) return 'Accept Invitation';
  if (isClaimed.value) return 'View cards';
  if (isStrandedExpiredInvite.value) return '';
  return 'View cards';
});

async function openCards() {
  if (isClaimed.value && invitation.value?.organizationSlug) {
    return navigateTo(
      `${ROUTES.PLATFORM.ROOT}/${invitation.value.organizationSlug}/cards`
    );
  }
  const orgs =
    organizations.value ?? (await loadUserOrganizations().catch(() => []));
  return navigateTo(workspaceCardsPath(orgs));
}

function onAction() {
  if (isAcceptInProgress.value) return;
  if (invitation.value?.canAccept) return onAccept();
  return openCards();
}

function onRetry() {
  if (isOtherAccount.value) return signOut();
  if (isMissing.value) return openCards();
  void refresh();
}
</script>

<template>
  <UiInvitationScreen
    :pending="pending"
    :error-title="errorTitle"
    :error-message="errorTitle ? errorMessage : undefined"
    :retry-label="
      isOtherAccount
        ? 'Sign out & switch account'
        : isMissing
          ? 'View cards'
          : undefined
    "
    :cover-src="INVITATION_COVER_FALLBACK"
    cover-aspect-class="aspect-[1/0.583]"
    :organization-name="invitation?.organizationName"
    :meta="meta"
    :notice="notice"
    :notice-color="noticeColor"
    :action-label="actionLabel"
    :action-loading="isAcceptInProgress"
    @action="onAction"
    @retry="onRetry"
  >
    <template v-if="showExpiredSupport" #support>
      <UAlert
        color="info"
        variant="soft"
        title="Contact La Persona"
        class="w-full text-center"
      >
        <template #description>
          <p>
            Ask for a new invitation on
            <a
              href="https://www.facebook.com/share/1BBTr3Emyh/"
              target="_blank"
              rel="noopener noreferrer"
              class="text-ink underline underline-offset-2"
            >
              Facebook
            </a>
            or&nbsp;<a
              href="https://m.me/61571393589144"
              target="_blank"
              rel="noopener noreferrer"
              class="text-ink underline underline-offset-2"
            >
              Messenger</a
            >.
          </p>
        </template>
      </UAlert>
    </template>
  </UiInvitationScreen>
</template>
