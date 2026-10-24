<script setup lang="ts">
definePageMeta({
  layout: 'platform',
});

useSeoMeta({ ...getSeoTitle('Create New Contact - LA PERSONA') });

const route = useRoute();
const orgSlug = computed(() => String(route.params.orgSlug || ''));

async function goBack() {
  await navigateTo(`/platform/${orgSlug.value}/contacts`);
}

async function goToContacts() {
  await navigateTo(`/platform/${orgSlug.value}/contacts?view=list&page=1`);
}
</script>

<template>
  <div class="flex flex-col gap-8">
    <div class="space-y-3">
      <div class="flex items-center gap-2">
        <UButton
          size="xl"
          icon="i-lucide-chevron-left"
          color="neutral"
          variant="ghost"
          class="size-7 rounded p-0 text-ink hover:bg-raised"
          aria-label="Go back to contacts"
          @click="goBack"
        />
        <h1
          class="text-2xl font-medium uppercase tracking-widest leading-tight"
        >
          Create New Contact
        </h1>
      </div>
      <p class="text-sm text-subtle">Manually add a new contact.</p>
    </div>

    <UCard
      :ui="{
        root: 'rounded-[8px] bg-surface border border-transparent',
        body: 'p-5 sm:p-8',
      }"
    >
      <div class="mb-8 space-y-4">
        <h2 class="text-[20px] font-medium uppercase tracking-widest text-ink">
          New Contact
        </h2>
        <p class="text-sm text-subtle">
          This information will be shown in "the contacts".
        </p>
      </div>
      <ContactManualForm
        :organization-slug="orgSlug"
        layout="wide"
        @created="goToContacts"
      />
    </UCard>
  </div>
</template>
