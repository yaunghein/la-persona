<script setup lang="ts">
useSeoMeta({ ...getSeoTitle('Community invitation - LA PERSONA') });

const route = useRoute();
const toast = useToast();
const invitationId = computed(() => String(route.params.token || ''));

const { data, isPending, isError, error, refetch } =
  useInvitationPreviewQuery(invitationId);
const { mutate: acceptInvitation, isPending: isAccepting } =
  useAcceptInvitationMutation(invitationId);

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

const errorMessage = computed(() =>
  apiErrorMessage(error.value, 'This invitation is invalid.')
);

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
  if (!data.value) return '';
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
    :error-title="isError ? 'Invitation unavailable' : undefined"
    :error-message="isError ? errorMessage : undefined"
    :cover-src="data ? invitationCoverSrc(data.coverUrl) : undefined"
    :logo-src="data ? invitationLogoSrc(data.logoUrl) : undefined"
    :organization-name="data?.organizationName"
    :meta="meta"
    :notice="notice"
    :notice-color="noticeColor"
    :action-label="actionLabel"
    :action-loading="isAccepting"
    @action="onAction"
    @retry="() => void refetch()"
  />
</template>
