<script setup lang="ts">
useSeoMeta({ ...getSeoTitle('Community invitation - LA PERSONA') });

const route = useRoute();
const toast = useToast();
const invitationId = computed(() => String(route.params.token || ''));

const { data, isPending, isError, error, refetch } =
  useInvitationPreviewQuery(invitationId);
const {
  mutate: acceptInvitation,
  isPending: isAccepting,
  isSuccess: isAccepted,
} = useAcceptInvitationMutation(invitationId);
// The refetch after accepting reports alreadyMember before we navigate away.
const isAcceptInProgress = computed(
  () => isAccepting.value || isAccepted.value
);

function accept() {
  acceptInvitation(undefined, {
    onSuccess: (result) => {
      if (result.status === 'accepted') return navigateTo(result.redirectTo);
    },
    onError: (error) => {
      toast.add({
        title: 'Could not accept invitation',
        description: apiErrorMessage(error, 'Try again.'),
        color: 'error',
      });
    },
  });
}

const { data: session } = await authClient.useSession(useFetch);

const isOtherAccount = computed(
  () => apiErrorCode(error.value) === 'not_invitee'
);

const errorTitle = computed(() => {
  if (!isError.value) return undefined;
  return isOtherAccount.value
    ? 'Signed in with another account'
    : 'Invitation unavailable';
});

const errorMessage = computed(() => {
  const message = apiErrorMessage(error.value, 'This invitation is invalid.');
  const viewerEmail = session.value?.user.email;
  return isOtherAccount.value && viewerEmail
    ? `${message} You're signed in as ${viewerEmail}.`
    : message;
});

function onRetry() {
  if (isOtherAccount.value) return signOut();
  void refetch();
}

useInAppBrowserPreview(() => {
  if (!data.value) return null;
  const { organizationName, logoUrl, coverUrl } = data.value;
  return {
    heading: `Join ${organizationName} in Your\u00a0Browser`,
    item: {
      imageUrl: invitationLogoSrc(logoUrl) || communityCoverSrc(coverUrl),
      title: organizationName,
      description: communityInviteMeta(data.value).slice(0, 2).join(' · '),
    },
  };
});

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
  if (!data.value || isAcceptInProgress.value) return '';
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
  if (isAcceptInProgress.value) return 'Accept Invitation';
  if (data.value.alreadyMember) return 'Open community';
  if (canAccept.value) return 'Accept Invitation';
  return '';
});

function onAction() {
  if (data.value?.alreadyMember) {
    return navigateTo(`${ROUTES.PLATFORM.ROOT}/${data.value.organizationSlug}`);
  }
  accept();
}
</script>

<template>
  <UiInvitationScreen
    :pending="isPending"
    :error-title="errorTitle"
    :error-message="isError ? errorMessage : undefined"
    :retry-label="isOtherAccount ? 'Sign out & switch account' : undefined"
    :cover-src="data ? invitationCoverSrc(data.coverUrl) : undefined"
    :logo-src="data ? invitationLogoSrc(data.logoUrl) : undefined"
    :organization-name="data?.organizationName"
    :meta="meta"
    :notice="notice"
    :notice-color="noticeColor"
    :action-label="actionLabel"
    :action-loading="isAcceptInProgress"
    @action="onAction"
    @retry="onRetry"
  />
</template>
