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
          class="size-7 rounded p-0 text-white hover:bg-[#232323]"
          aria-label="Go back to contacts"
          @click="goBack"
        />
        <h1
          class="text-2xl font-medium uppercase tracking-widest leading-tight"
        >
          Create New Contact
        </h1>
      </div>
      <p class="text-sm text-[#8b8b8b]">Manually add a new contact.</p>
    </div>

    <UCard
      :ui="{
        root: 'rounded-[8px] bg-[#171717] border border-transparent',
        body: 'p-5 sm:p-8',
      }"
    >
      <div class="mb-8 space-y-4">
        <h2
          class="text-[20px] font-medium uppercase tracking-widest text-white"
        >
          New Contact
        </h2>
        <p class="text-sm text-[#8b8b8b]">
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
