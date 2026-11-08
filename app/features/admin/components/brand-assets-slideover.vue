<script setup lang="ts">
defineProps<{
  organization: { id: string; name: string } | null;
}>();

const open = defineModel<boolean>('open', { required: true });
</script>

<template>
  <USlideover
    v-model:open="open"
    side="right"
    inset
    title="UPLOAD ASSETS"
    :description="organization?.name"
    :ui="{
      header: 'border-b-2 border-raised px-6 py-6',
      title: 'text-sm font-medium tracking-[1.4px] text-ink uppercase',
      description: 'text-sm text-subtle',
      body: 'px-6',
    }"
  >
    <template #body>
      <div v-if="organization" class="flex flex-col gap-6 py-2">
        <p class="text-sm leading-relaxed text-subtle">
          Uploads are saved right away under the community slug. To replace one,
          delete it first and upload the new&nbsp;file.
        </p>

        <p class="text-sm font-medium tracking-[1.4px] text-ink uppercase">
          Card images
        </p>
        <AdminBrandAssetField
          :organization-id="organization.id"
          kind="wallpaper"
          label="Wallpaper"
          delete-note="The file is removed from storage and the community falls back to the default wallpaper. Member cards that already use it show no image until you upload a new&nbsp;one."
        />
        <AdminBrandAssetField
          :organization-id="organization.id"
          kind="back"
          label="Card back"
          delete-note="The file is removed from storage and the community falls back to the default card back. Member cards that already use it show no image until you upload a new&nbsp;one."
        />

        <p
          class="border-t border-raised pt-6 text-sm font-medium tracking-[1.4px] text-ink uppercase"
        >
          Email images
        </p>
        <AdminBrandAssetField
          :organization-id="organization.id"
          kind="email-qr"
          label="QR ticket background"
          hint="Use the ticket template layout (952 × 936). The QR is placed by position, so the white ticket must stay in the same spot."
          delete-note="The file is removed from storage and emails use the default ticket&nbsp;background."
        />
        <AdminBrandAssetField
          :organization-id="organization.id"
          kind="email-contact-exchange"
          label="Contact exchange (reminder email)"
          hint="Two phones exchanging cards, 952 px wide."
          delete-note="The file is removed from storage and the reminder email hides this&nbsp;image."
        />
        <AdminBrandAssetField
          :organization-id="organization.id"
          kind="email-after-event"
          label="Community card uses (after-event email)"
          hint="The three-panel image (share, stay ready, register), 952 px wide."
          delete-note="The file is removed from storage and the after-event email hides this&nbsp;image."
        />
      </div>
    </template>
  </USlideover>
</template>
