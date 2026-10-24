<script setup lang="ts">
import { ORGANIZATION_TYPES } from '~~/shared/utils/constants';

const open = defineModel<boolean>('open', { required: true });

const requestForm = useTemplateRef('requestForm');

// New cards always belong to the caller's personal workspace, whichever
// organization they are browsing.
const { data: userOrgs } = useUserOrganizations();
const personalOrganizationSlug = computed(
  () =>
    (userOrgs.value || []).find(
      (org) => org.type === ORGANIZATION_TYPES.PERSONAL
    )?.slug || ''
);

// Start loading what the form needs while the slideover is still closed,
// so it opens fully rendered.
useSubscriptionPlansQuery();
useOrganizationCardsQuery(personalOrganizationSlug);
</script>

<template>
  <USlideover
    v-model:open="open"
    side="right"
    inset
    title="REQUEST NEW CARD"
    :ui="{
      header: 'border-b-2 border-raised px-6 py-6',
      title: 'text-sm font-medium tracking-[1.4px] text-ink uppercase',
      body: 'px-6',
      content: 'bg-surface',
    }"
  >
    <template #body>
      <CardRequestForm
        v-if="personalOrganizationSlug"
        ref="requestForm"
        :organization-slug="personalOrganizationSlug"
        @close="open = false"
      />
    </template>

    <template v-if="!requestForm?.success" #footer>
      <UButton
        type="submit"
        form="card-request-form"
        label="Send Request"
        leading-icon="i-lucide-send"
        color="neutral"
        :loading="requestForm?.isSubmitting"
        class="h-10 cursor-pointer rounded-full bg-ink pr-6 pl-5 text-sm font-medium text-ink-inverse hover:bg-ink/90"
      />
    </template>
  </USlideover>
</template>
