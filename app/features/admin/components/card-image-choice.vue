<script setup lang="ts">
import {
  MAX_UPLOAD_BYTES,
  UPLOAD_CONTENT_TYPES,
  type StoredUpload,
} from '~~/shared/contracts/media';
import { resolveObjectStorageUrl } from '~~/shared/utils/object-storage';

const props = defineProps<{
  label: string;
  images: StoredUpload[];
  loading: boolean;
  error: string;
}>();

const file = defineModel<File | null>('file', { required: true });
const existingKey = defineModel<string>('existingKey', { required: true });

const toast = useToast();

const chosen = computed(() =>
  props.images.find((image) => image.key === existingKey.value)
);
const previewUrl = computed(
  () =>
    chosen.value?.url ||
    (existingKey.value ? resolveObjectStorageUrl(existingKey.value) : '')
);
const fileName = computed(
  () => chosen.value?.fileName || existingKey.value.split('/').pop() || ''
);

watch(file, (next) => {
  if (!next) return;
  const allowed = UPLOAD_CONTENT_TYPES.some((type) => type === next.type);
  if (!allowed || next.size > MAX_UPLOAD_BYTES || next.size <= 0) {
    file.value = null;
    toast.add({
      title: 'Wrong file',
      description: !allowed
        ? 'Upload a JPG, PNG or WebP image.'
        : 'Images must be 5 MB or smaller.',
      color: 'warning',
    });
    return;
  }
  existingKey.value = '';
});

watch(existingKey, (key) => {
  if (key) file.value = null;
});
</script>

<template>
  <UFormField
    :label="label"
    required
    class="[&_label]:mb-3 [&_label]:text-sm [&_label]:font-medium [&_label]:text-ink"
  >
    <div v-if="existingKey" class="flex flex-col gap-3">
      <p class="font-mono text-xs text-ink/50">{{ fileName }}</p>
      <div
        class="flex aspect-[1/0.6] w-full items-center justify-center overflow-hidden rounded-lg border border-ink/10 bg-ink/3"
      >
        <img :src="previewUrl" :alt="label" class="size-full object-contain" />
      </div>
      <div class="flex justify-end">
        <UButton
          label="Remove"
          leading-icon="i-lucide-x"
          color="neutral"
          variant="soft"
          class="h-10 cursor-pointer rounded-full px-5 text-sm font-medium"
          @click="
            () => {
              existingKey = '';
            }
          "
        />
      </div>
    </div>

    <div v-else class="flex flex-col gap-3">
      <UFileUpload
        v-model="file"
        :accept="UPLOAD_CONTENT_TYPES.join(',')"
        icon="i-lucide-image-up"
        :label="`Drop the ${label.toLowerCase()} here`"
        description="JPG, PNG or WebP, up to 5 MB"
        class="aspect-[1/0.6] w-full"
        :ui="{
          root: '[&_img]:object-contain',
          base: 'rounded-lg border-ink/10 bg-ink/3',
          label: 'text-sm text-ink',
          description: 'text-xs text-subtle',
        }"
      />
      <USelectMenu
        v-if="!file"
        v-model="existingKey"
        value-key="key"
        label-key="fileName"
        :items="images"
        :loading="loading"
        clear
        placeholder="Or use an image already in uploads/"
        :search-input="{
          placeholder: 'Search uploads/',
          icon: 'i-lucide-search',
        }"
        class="w-full"
        size="xl"
        :ui="{
          base: 'h-[47px] w-full rounded-[4px] border-line bg-raised px-3 text-sm text-ink',
          content: 'border border-line bg-raised',
          item: 'text-ink data-[highlighted]:bg-raised',
        }"
      />
      <p v-if="error" class="text-sm leading-relaxed text-error">{{ error }}</p>
    </div>
  </UFormField>
</template>
