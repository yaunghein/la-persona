<script setup lang="ts">
const route = useRoute();
const toast = useToast();
const invitationId = computed(() => String(route.params.token || ''));

const { data, isPending, isError, error, refetch } =
  useInvitationPreviewQuery(invitationId);
const isCompany = computed(
  () => data.value?.organizationType === ORGANIZATION_TYPES.COMPANY
);
const organizationLabel = computed(() =>
  isCompany.value ? 'company' : 'community'
);

const seoTitle = computed(() =>
  isCompany.value
    ? 'Company invitation - LA PERSONA'
    : 'Community invitation - LA PERSONA'
);
useSeoMeta({ title: seoTitle, ogTitle: seoTitle, twitterTitle: seoTitle });
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
const isMissing = computed(() => apiErrorStatus(error.value) === 404);

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

async function openCards() {
  const orgs = await loadUserOrganizations().catch(() => []);
  return navigateTo(workspaceCardsPath(orgs));
}

function onRetry() {
  if (isOtherAccount.value) return signOut();
  if (isMissing.value) return openCards();
  void refetch();
}

const meta = computed(() =>
  data.value && !isCompany.value ? communityInviteMeta(data.value) : []
);

useInAppBrowserPreview(() => {
  if (!data.value) return null;
  const { organizationName, logoUrl, coverUrl } = data.value;
  return {
    heading: `Join ${organizationName} in Your\u00a0Browser`,
    item: {
      imageUrl:
        invitationLogoSrc(logoUrl) ||
        (isCompany.value ? null : communityCoverSrc(coverUrl)),
      title: organizationName,
      description: meta.value.slice(0, 2).join(' • '),
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

const notice = computed(() => {
  if (!data.value || isAcceptInProgress.value) return '';
  if (data.value.alreadyMember) {
    return `You are already a member of this ${organizationLabel.value}.`;
  }
  if (data.value.status === 'accepted') {
    return 'This invitation has already been\u00a0accepted.';
  }
  if (data.value.status === 'rejected') {
    return 'This invitation was\u00a0declined.';
  }
  if (data.value.status === 'canceled' || data.value.status === 'cancelled') {
    return 'This invitation was\u00a0cancelled.';
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
  if (data.value.alreadyMember) return `Open ${organizationLabel.value}`;
  if (canAccept.value) return 'Accept Invitation';
  return 'View cards';
});

function onAction() {
  if (data.value?.alreadyMember) {
    return navigateTo(`${ROUTES.PLATFORM.ROOT}/${data.value.organizationSlug}`);
  }
  if (canAccept.value) return accept();
  return openCards();
}
</script>

<template>
  <UiInvitationScreen
    :pending="isPending"
    :error-title="errorTitle"
    :error-message="isError ? errorMessage : undefined"
    :retry-label="
      isOtherAccount
        ? 'Sign out & switch account'
        : isMissing
          ? 'View cards'
          : undefined
    "
    :cover-src="data ? invitationCoverSrc(data.coverUrl) : undefined"
    :hide-cover="isCompany"
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
