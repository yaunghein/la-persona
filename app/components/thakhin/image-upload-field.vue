<script setup lang="ts">
import imageCompression from 'browser-image-compression';

const props = defineProps<{
  organizationId: string;
  label: string;
  hint?: string;
  /** What the email shows while no image is set. */
  emptyText: string;
}>();

const url = defineModel<string>({ required: true });

const toast = useToast();
const fileInput = useTemplateRef<HTMLInputElement>('fileInput');
const uploading = ref(false);

const previewUrl = computed(() => {
  if (!url.value) return '';
  if (url.value.startsWith('http') || url.value.startsWith('/')) {
    return url.value;
  }
  return resolveObjectStorageUrl(url.value);
});

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    toast.add({
      title: 'Choose an image',
      description: `${props.label} accepts JPG, PNG, or WebP.`,
      color: 'warning',
    });
    return;
  }

  uploading.value = true;
  try {
    // Emails show these at 476px wide; keep 2x for sharp retina rendering.
    const compressed = await imageCompression(file, {
      maxSizeMB: 1,
      maxWidthOrHeight: 1904,
    });
    const { uploadUrl, fileKey } = await $fetch('/api/s3/admin-presigned', {
      method: 'POST',
      body: {
        organizationId: props.organizationId,
        fileType: compressed.type,
        fileName: file.name,
      },
    });
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      body: compressed,
      headers: { 'Content-Type': compressed.type },
    });
    if (!response.ok) throw new Error('Upload failed');

    url.value = resolveObjectStorageUrl(fileKey);
  } catch (error: any) {
    toast.add({
      title: 'Upload failed',
      description: error?.data?.statusMessage || error?.message || 'Try again.',
      color: 'error',
    });
  } finally {
    uploading.value = false;
  }
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div>
      <p class="text-sm font-medium text-white">{{ label }}</p>
      <p v-if="hint" class="mt-1 text-xs leading-relaxed text-white/50">
        {{ hint }}
      </p>
    </div>

    <div
      class="flex aspect-[1/0.6] w-full items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white/[0.03]"
    >
      <img
        v-if="previewUrl"
        :src="previewUrl"
        :alt="label"
        class="size-full object-contain"
      />
      <p v-else class="px-4 text-center text-xs text-white/40">
        {{ emptyText }}
      </p>
    </div>

    <div class="flex gap-2">
      <input
        ref="fileInput"
        type="file"
        class="hidden"
        accept="image/*"
        @change="onFileChange"
      />
      <UButton
        :label="url ? 'Replace' : 'Upload'"
        leading-icon="i-lucide-upload"
        color="neutral"
        :loading="uploading"
        class="h-9 cursor-pointer rounded-full bg-[#232323] py-2 pr-6 pl-4 text-sm font-medium text-white hover:bg-[#2a2a2a]"
        @click="fileInput?.click()"
      />
      <UButton
        v-if="url"
        label="Remove"
        color="neutral"
        variant="ghost"
        class="h-9 cursor-pointer rounded-full px-4 text-sm text-white/70 hover:bg-[#232323]"
        @click="() => { url = ''; }"
      />
    </div>
  </div>
</template>
