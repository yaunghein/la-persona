<script setup lang="ts">
import {
  brandAssetContentTypes,
  MAX_UPLOAD_BYTES,
  type BrandAssetKind,
} from '~~/shared/contracts/media';

const props = defineProps<{
  organizationId: string;
  kind: BrandAssetKind;
  label: string;
  hint?: string;
  /** What happens once the file is deleted. */
  deleteNote: string;
}>();

const toast = useToast();
const invalidateAdmin = useInvalidateAdmin();
const { data: assets, dataUpdatedAt } = useAdminBrandAssetsQuery(
  () => props.organizationId
);
const asset = computed(() => assets.value?.find((a) => a.kind === props.kind));

const contentTypes = computed(() => brandAssetContentTypes(props.kind));
const isEmailImage = computed(() => !contentTypes.value.includes('image/webp'));

const selectedFile = ref<File | null>(null);
const isUploading = ref(false);
const isDeleteOpen = ref(false);
const isDeleting = ref(false);

/** The key never changes, so the preview needs a fresh URL after a re-upload. */
const previewUrl = computed(() =>
  asset.value ? `${asset.value.url}?v=${dataUpdatedAt.value}` : ''
);

watch(
  () => props.organizationId,
  () => {
    selectedFile.value = null;
  }
);

async function uploadAsset() {
  const file = selectedFile.value;
  if (!file) return;

  const contentType = contentTypes.value.find((type) => type === file.type);
  const problem = !contentType
    ? isEmailImage.value
      ? 'Email images must be JPG or PNG.'
      : 'Upload a JPG, PNG or WebP image.'
    : file.size > MAX_UPLOAD_BYTES
      ? 'Images must be 5 MB or smaller.'
      : '';
  if (!contentType || problem) {
    toast.add({ title: 'Wrong file', description: problem, color: 'warning' });
    return;
  }

  isUploading.value = true;
  try {
    // Uploaded as is: the admin optimizes it beforehand.
    const ticket = await adminApi.createBrandAssetUpload(props.organizationId, {
      kind: props.kind,
      contentType,
      contentLength: file.size,
    });
    const response = await fetch(ticket.uploadUrl, {
      method: 'PUT',
      body: file,
      headers: ticket.headers,
    });
    if (!response.ok) throw new Error('Upload failed. Please try again.');
    await adminApi.applyBrandAsset(props.organizationId, props.kind);
    await invalidateAdmin();
    selectedFile.value = null;
    toast.add({ title: `${props.label} uploaded`, color: 'success' });
  } catch (error) {
    toast.add({
      title: 'Upload failed',
      description: apiErrorMessage(error),
      color: 'error',
    });
  } finally {
    isUploading.value = false;
  }
}

async function onConfirmDelete() {
  if (!asset.value) return;
  isDeleting.value = true;
  try {
    await adminApi.deleteBrandAsset(props.organizationId, props.kind);
    await invalidateAdmin();
    toast.add({ title: `${asset.value.fileName} deleted`, color: 'success' });
    isDeleteOpen.value = false;
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
  <div class="flex flex-col gap-3">
    <div>
      <p class="text-sm font-medium text-ink">{{ label }}</p>
      <p v-if="hint" class="mt-1 text-xs leading-relaxed text-ink/50">
        {{ hint }}
      </p>
      <p v-if="asset" class="mt-1 font-mono text-xs text-ink/50">
        {{ asset.fileName }}
      </p>
    </div>

    <p v-if="!asset" class="text-sm text-ink/45">Loading…</p>

    <template v-else-if="asset.exists">
      <div
        class="flex aspect-[1/0.6] w-full items-center justify-center overflow-hidden rounded-lg border border-ink/10 bg-ink/3"
      >
        <img :src="previewUrl" :alt="label" class="size-full object-contain" />
      </div>
      <div class="flex justify-end">
        <UButton
          label="Delete"
          leading-icon="i-lucide-trash-2"
          color="error"
          variant="soft"
          class="h-10 cursor-pointer rounded-full px-5 text-sm font-medium"
          @click="
            () => {
              isDeleteOpen = true;
            }
          "
        />
      </div>
    </template>

    <template v-else>
      <UFileUpload
        v-model="selectedFile"
        :accept="contentTypes.join(',')"
        icon="i-lucide-image-up"
        :label="`Drop the ${label.toLowerCase()} here`"
        :description="
          isEmailImage
            ? 'JPG or PNG, up to 5 MB'
            : 'WebP recommended, JPG or PNG also work, up to 5 MB'
        "
        :disabled="isUploading"
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
          :loading="isUploading"
          :disabled="!selectedFile"
          class="h-10 cursor-pointer rounded-full bg-raised pr-6 pl-4 text-sm font-medium text-ink hover:bg-line disabled:bg-raised aria-disabled:bg-raised"
          @click="uploadAsset"
        />
      </div>
    </template>

    <UModal
      v-model:open="isDeleteOpen"
      :close="false"
      :dismissible="!isDeleting"
      :ui="{ content: 'bg-surface max-w-md' }"
      :title="`Delete ${asset?.fileName}?`"
    >
      <template #body>
        <p class="text-sm leading-relaxed text-ink/70">{{ deleteNote }}</p>
      </template>
      <template #footer>
        <UButton
          label="Cancel"
          color="neutral"
          variant="ghost"
          :disabled="isDeleting"
          @click="
            () => {
              isDeleteOpen = false;
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
  </div>
</template>
