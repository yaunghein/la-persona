<script setup lang="ts">
import { ORGANIZATION_TYPES } from '~~/shared/utils/constants';

const { data: userOrgs, isError } = useUserOrganizations();

watch(
  [userOrgs, isError],
  () => {
    if (isError.value)
      return navigateTo(ROUTES.PLATFORM.ROOT, { replace: true });
    if (!userOrgs.value) return;

    const workspace =
      userOrgs.value.find((org) => org.type === ORGANIZATION_TYPES.PERSONAL) ||
      userOrgs.value[0];

    return navigateTo(
      workspace
        ? `${ROUTES.PLATFORM.ROOT}/${workspace.slug}/contacts`
        : ROUTES.PLATFORM.ROOT,
      { replace: true }
    );
  },
  { immediate: true }
);
</script>

<template>
  <div class="flex h-dvh items-center justify-center">
    <div class="flex flex-col items-center gap-3">
      <UIcon
        name="i-lucide-loader-2"
        class="size-8 animate-spin text-primary"
      />
      <p class="animate-pulse text-sm text-gray-500">
        Opening your contacts...
      </p>
    </div>
  </div>
</template>
