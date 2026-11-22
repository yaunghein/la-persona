<script setup lang="ts">
import {
  brandAssetContentTypes,
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

const invalidateAdmin = useInvalidateAdmin();
const { data: assets, dataUpdatedAt } = useAdminBrandAssetsQuery(
  () => props.organizationId
);
const asset = computed(() => assets.value?.find((a) => a.kind === props.kind));
const contentTypes = computed(() => brandAssetContentTypes(props.kind));

/** The key never changes, so the preview needs a fresh URL after a re-upload. */
const previewUrl = computed(() =>
  asset.value?.exists ? `${asset.value.url}?v=${dataUpdatedAt.value}` : ''
);

async function upload(file: File) {
  const contentType = contentTypes.value.find((type) => type === file.type);
  if (!contentType) throw new Error('Upload a JPG, PNG or WebP image.');
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
}

async function remove() {
  await adminApi.deleteBrandAsset(props.organizationId, props.kind);
  await invalidateAdmin();
}
</script>

<template>
  <AdminStoredImageField
    :label="label"
    :hint="hint"
    :delete-note="deleteNote"
    :file-name="asset?.fileName ?? ''"
    :exists="Boolean(asset?.exists)"
    :preview-url="previewUrl"
    :loading="!asset"
    :content-types="contentTypes"
    :reset-key="`${organizationId}:${kind}`"
    :upload="upload"
    :remove="remove"
  />
</template>
