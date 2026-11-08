<script setup lang="ts">
import { MAX_UPLOAD_BYTES, type BrandAsset } from '~~/shared/contracts/media';

const props = defineProps<{
  organization: { id: string; slug: string; name: string } | null;
}>();

const open = defineModel<boolean>('open', { required: true });

const LABELS: Record<BrandAsset['kind'], string> = {
  wallpaper: 'Wallpaper',
  back: 'Card back',
};

const toast = useToast();
const invalidateAdmin = useInvalidateAdmin();
const organizationId = computed(() => props.organization?.id ?? '');
const {
  data: assets,
  isLoading,
  dataUpdatedAt,
} = useAdminBrandAssetsQuery(organizationId);

const uploadingKind = ref<BrandAsset['kind'] | null>(null);
const selectedFiles = ref<Record<BrandAsset['kind'], File | null>>({
  wallpaper: null,
  back: null,
});
const assetToDelete = ref<BrandAsset | null>(null);
const isDeleting = ref(false);

/** The key never changes, so the preview needs a fresh URL after a re-upload. */
function previewUrl(asset: BrandAsset) {
  return `${asset.url}?v=${dataUpdatedAt.value}`;
}

watch(organizationId, () => {
  selectedFiles.value = { wallpaper: null, back: null };
});

async function uploadAsset(asset: BrandAsset) {
  const file = selectedFiles.value[asset.kind];
  const organization = props.organization;
  if (!file || !organization) return;

  const problem =
    file.type !== 'image/webp'
      ? 'Convert the image to WebP first.'
      : file.size > MAX_UPLOAD_BYTES
        ? 'Images must be 5 MB or smaller.'
        : '';
  if (problem) {
    toast.add({ title: 'Wrong file', description: problem, color: 'warning' });
    return;
  }

  uploadingKind.value = asset.kind;
  try {
    // Already optimized with towebp.io, so the file is uploaded as is.
    const ticket = await adminApi.createBrandAssetUpload(organization.id, {
      kind: asset.kind,
      contentLength: file.size,
    });
    const response = await fetch(ticket.uploadUrl, {
      method: 'PUT',
      body: file,
      headers: ticket.headers,
    });
    if (!response.ok) throw new Error('Upload failed. Please try again.');
    await adminApi.applyBrandAsset(organization.id, asset.kind);
    await invalidateAdmin();
    selectedFiles.value[asset.kind] = null;
    toast.add({ title: `${LABELS[asset.kind]} uploaded`, color: 'success' });
  } catch (error) {
    toast.add({
      title: 'Upload failed',
      description: apiErrorMessage(error),
      color: 'error',
    });
  } finally {
    uploadingKind.value = null;
  }
}

async function onConfirmDelete() {
  const asset = assetToDelete.value;
  if (!asset || !props.organization) return;
  isDeleting.value = true;
  try {
    await adminApi.deleteBrandAsset(props.organization.id, asset.kind);
    await invalidateAdmin();
    toast.add({ title: `${asset.fileName} deleted`, color: 'success' });
    assetToDelete.value = null;
  } catch (error) {
    toast.add({
      title: 'Delete failed',
      description: apiErrorMessage(error),
      color: 'error',
    });
  } finally {
    isDeleting.value = false;
  }
}
</script>

<template>
  <USlideover
    v-model:open="open"
    side="right"
    inset
    title="UPLOAD ASSETS"
    :ui="{
      header: 'border-b-2 border-raised px-6 py-6',
      title: 'text-sm font-medium tracking-[1.4px] text-ink uppercase',
      body: 'px-6',
    }"
  >
    <template #body>
      <div v-if="organization" class="flex flex-col gap-6 py-2">
        <p class="text-sm leading-relaxed text-subtle">
          Pre-optimize each image to WebP with
          <a
            href="https://towebp.io/"
            target="_blank"
            rel="noopener noreferrer"
            class="text-ink underline underline-offset-2"
            >towebp.io</a
          >. Uploads are saved under the community slug automatically. To
          replace one, delete it first and upload the new&nbsp;file.
        </p>

        <p v-if="isLoading" class="text-sm text-ink/45">Loading assets…</p>

        <div
          v-for="asset in assets"
          :key="asset.kind"
          class="flex flex-col gap-3"
        >
          <div>
            <p class="text-sm font-medium text-ink">{{ LABELS[asset.kind] }}</p>
            <p class="mt-1 font-mono text-xs text-ink/50">
              {{ asset.fileName }}
            </p>
          </div>

          <template v-if="asset.exists">
            <div
              class="flex aspect-[1/0.6] w-full items-center justify-center overflow-hidden rounded-lg border border-ink/10 bg-ink/3"
            >
              <img
                :src="previewUrl(asset)"
                :alt="LABELS[asset.kind]"
                class="size-full object-contain"
              />
            </div>
            <div>
              <UButton
                label="Delete"
                leading-icon="i-lucide-trash-2"
                color="error"
                variant="soft"
                class="h-10 cursor-pointer rounded-full px-5 text-sm font-medium"
                @click="
                  () => {
                    assetToDelete = asset;
                  }
                "
              />
            </div>
          </template>

          <template v-else>
            <UFileUpload
              v-model="selectedFiles[asset.kind]"
              accept="image/webp"
              icon="i-lucide-image-up"
              :label="`Drop the ${LABELS[asset.kind].toLowerCase()} here`"
              description="WebP, up to 5 MB"
              :disabled="uploadingKind === asset.kind"
              class="aspect-[1/0.6] w-full"
              :ui="{
                root: '[&_img]:object-contain',
                base: 'rounded-lg border-ink/10 bg-ink/3',
                label: 'text-sm text-ink',
                description: 'text-xs text-subtle',
              }"
            />
            <div class="flex justify-end">
              <UButton
                label="Upload"
                leading-icon="i-lucide-upload"
                color="neutral"
                :loading="uploadingKind === asset.kind"
                :disabled="!selectedFiles[asset.kind] || !!uploadingKind"
                class="h-10 cursor-pointer rounded-full bg-raised pr-6 pl-4 text-sm font-medium text-ink hover:bg-line disabled:bg-raised aria-disabled:bg-raised"
                @click="uploadAsset(asset)"
              />
            </div>
          </template>
        </div>
      </div>
    </template>
  </USlideover>

  <UModal
    :open="!!assetToDelete"
    :close="false"
    :dismissible="!isDeleting"
    :ui="{ content: 'bg-surface max-w-md' }"
    :title="`Delete ${assetToDelete?.fileName}?`"
    @update:open="(value) => !value && (assetToDelete = null)"
  >
    <template #body>
      <p class="text-sm leading-relaxed text-ink/70">
        The file is removed from storage and the community falls back to the
        default
        {{ assetToDelete ? LABELS[assetToDelete.kind].toLowerCase() : '' }}.
        Member cards that already use it show no image until you upload a
        new&nbsp;one.
      </p>
    </template>
    <template #footer>
      <UButton
        label="Cancel"
        color="neutral"
        variant="ghost"
        :disabled="isDeleting"
        @click="
          () => {
            assetToDelete = null;
          }
        "
      />
      <UButton
        label="Delete"
        color="error"
        :loading="isDeleting"
        @click="onConfirmDelete"
      />
    </template>
  </UModal>
</template>
