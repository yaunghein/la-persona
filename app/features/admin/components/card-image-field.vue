<script setup lang="ts">
import { refDebounced } from '@vueuse/core';
import {
  UPLOAD_CONTENT_TYPES,
  type CardImageKind,
} from '~~/shared/contracts/media';

const props = defineProps<{
  name: string;
  kind: CardImageKind;
  label: string;
  deleteNote: string;
}>();

const key = defineModel<string>({ required: true });

const invalidateAdmin = useInvalidateAdmin();
const imageName = computed(() => props.name.trim());
const queriedName = refDebounced(imageName, 300);
const {
  data: images,
  dataUpdatedAt,
  error,
  isFetching,
} = useAdminCardImagesQuery(queriedName);
const image = computed(() =>
  images.value?.find((item) => item.kind === props.kind)
);

/** The key never changes, so the preview needs a fresh URL after a re-upload. */
const previewUrl = computed(() =>
  image.value?.exists ? `${image.value.url}?v=${dataUpdatedAt.value}` : ''
);

// The file for this name is the image the card will use.
watch([image, isFetching, queriedName], () => {
  const next = image.value;
  if (
    !imageName.value ||
    !next ||
    isFetching.value ||
    queriedName.value !== imageName.value
  ) {
    return;
  }
  key.value = next.exists ? next.key : '';
});

async function upload(file: File) {
  const contentType = UPLOAD_CONTENT_TYPES.find((type) => type === file.type);
  if (!contentType) throw new Error('Upload a JPG, PNG or WebP image.');
  const ticket = await adminApi.createCardImageUpload({
    name: imageName.value,
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
  key.value = ticket.key;
  await invalidateAdmin();
}

async function remove() {
  await adminApi.deleteCardImage(props.kind, imageName.value);
  key.value = '';
  await invalidateAdmin();
}
</script>

<template>
  <div v-if="!imageName" class="flex flex-col gap-3">
    <p class="text-sm font-medium text-ink">{{ label }}</p>
    <p class="text-xs leading-relaxed text-ink/50">
      Enter a first or last name first. The file is named from&nbsp;it.
    </p>
  </div>
  <p
    v-else-if="
      kind === 'wallpaper' && error && queriedName === imageName && !isFetching
    "
    class="text-sm leading-relaxed text-error"
  >
    {{ apiErrorMessage(error) }}
  </p>
  <AdminStoredImageField
    v-else-if="!error || queriedName !== imageName || isFetching"
    :label="label"
    :delete-note="deleteNote"
    :file-name="image?.fileName ?? ''"
    :exists="Boolean(image?.exists)"
    :preview-url="previewUrl"
    :loading="queriedName !== imageName || !image"
    :content-types="UPLOAD_CONTENT_TYPES"
    :reset-key="`${imageName}:${kind}`"
    :upload="upload"
    :remove="remove"
  />
</template>
