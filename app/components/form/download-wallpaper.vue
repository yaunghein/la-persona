<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query';

type PhoneModel = {
  label: string;
  value: string;
  width: number;
  height: number;
};

const route = useRoute();
const runtimeConfig = useRuntimeConfig();
const toast = useToast();
const slug = computed(() => route.params.slug as string);

const phoneModels: PhoneModel[] = [
  {
    label: 'iPhone 15 Pro Max',
    value: 'iphone-15-pro-max',
    width: 1290,
    height: 2796,
  },
  {
    label: 'iPhone 15 / 14 / 13',
    value: 'iphone-15-14-13',
    width: 1179,
    height: 2556,
  },
  { label: 'iPhone 15 Pro', value: 'iphone-15-pro', width: 1179, height: 2556 },
  {
    label: 'Samsung S24 Ultra',
    value: 'samsung-s24-ultra',
    width: 1440,
    height: 3120,
  },
  {
    label: 'Google Pixel 8 Pro',
    value: 'pixel-8-pro',
    width: 844,
    height: 2992,
  },
];

const selectedModel = ref(phoneModels[0]!.value);
const isGeneratingWallpaper = ref(false);
const isGeneratingQr = ref(false);

const { data: card, isLoading } = useQuery<SelectCard>({
  queryKey: ['cards', slug],
  queryFn: () => $fetch(`/api/cards/${slug.value}`),
});

const selectedModelConfig = computed(
  () =>
    phoneModels.find((model) => model.value === selectedModel.value) ??
    phoneModels[0]!
);

function getS3Url(path?: string | null) {
  if (!path) return '';
  if (path.startsWith('http')) return path;

  const bucket = runtimeConfig.public.awsBucketName;
  const region = runtimeConfig.public.awsRegion;
  return `https://${bucket}.s3.${region}.amazonaws.com/${path}`;
}

const wallpaperAssetUrl = computed(() => getS3Url(card.value?.wallpaperUrl));
const qrAssetUrl = computed(() => getS3Url(card.value?.qrCodeUrl));

const previewWallpaperFrameStyle = computed(() => ({
  aspectRatio: `${selectedModelConfig.value.width} / ${selectedModelConfig.value.height}`,
}));

function triggerDownloadFromBlob(blob: Blob, fileName: string) {
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(blobUrl);
}

async function triggerDirectFileDownload(url: string, fileName: string) {
  const response = await fetch(url, { mode: 'cors' });
  if (!response.ok) throw new Error('Failed to download file');
  const blob = await response.blob();
  triggerDownloadFromBlob(blob, fileName);
}

function getSafeFileSegment(input?: string) {
  return (input || 'card').replace(/[^a-z0-9-_]+/gi, '-').toLowerCase();
}

async function loadImage(url: string) {
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load image'));
    image.src = url;
  });
}

function getCenterCropRect(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number
) {
  const sourceAspect = sourceWidth / sourceHeight;
  const targetAspect = targetWidth / targetHeight;

  if (sourceAspect > targetAspect) {
    const cropWidth = sourceHeight * targetAspect;
    return {
      sx: (sourceWidth - cropWidth) / 2,
      sy: 0,
      sw: cropWidth,
      sh: sourceHeight,
    };
  }

  const cropHeight = sourceWidth / targetAspect;
  return {
    sx: 0,
    sy: (sourceHeight - cropHeight) / 2,
    sw: sourceWidth,
    sh: cropHeight,
  };
}

async function downloadWallpaper() {
  if (!wallpaperAssetUrl.value) {
    toast.add({
      title: 'No wallpaper found',
      description: 'Please upload wallpaper first.',
      color: 'warning',
    });
    return;
  }

  isGeneratingWallpaper.value = true;
  try {
    const image = await loadImage(wallpaperAssetUrl.value);
    const { width, height, label } = selectedModelConfig.value;
    const crop = getCenterCropRect(
      image.naturalWidth,
      image.naturalHeight,
      width,
      height
    );

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas context unavailable');

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(
      image,
      crop.sx,
      crop.sy,
      crop.sw,
      crop.sh,
      0,
      0,
      width,
      height
    );

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (!result)
          return reject(new Error('Failed to create wallpaper file'));
        resolve(result);
      }, 'image/png');
    });

    const cardSlug = getSafeFileSegment(card.value?.slug);
    const modelSlug = getSafeFileSegment(label);
    triggerDownloadFromBlob(blob, `${cardSlug}-wallpaper-${modelSlug}.png`);
  } catch (error: any) {
    toast.add({
      title: 'Wallpaper download failed',
      description: error?.message || 'Unable to prepare wallpaper.',
      color: 'error',
    });
  } finally {
    isGeneratingWallpaper.value = false;
  }
}

async function downloadQr() {
  if (!qrAssetUrl.value) {
    toast.add({
      title: 'No QR code found',
      description: 'Please generate QR code first.',
      color: 'warning',
    });
    return;
  }

  isGeneratingQr.value = true;
  try {
    const cardSlug = getSafeFileSegment(card.value?.slug);
    await triggerDirectFileDownload(qrAssetUrl.value, `${cardSlug}-qr.png`);
  } catch (error: any) {
    toast.add({
      title: 'QR download failed',
      description: error?.message || 'Unable to download QR code.',
      color: 'error',
    });
  } finally {
    isGeneratingQr.value = false;
  }
}
</script>

<template>
  <div class="rounded-[8px] bg-[#171717] p-8">
    <div v-if="isLoading" class="space-y-8">
      <div class="space-y-3">
        <USkeleton class="h-6 w-52" />
        <USkeleton class="h-4 w-120" />
      </div>
      <div
        class="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_auto_auto] lg:items-start"
      >
        <USkeleton class="h-[80px] w-full" />
        <USkeleton class="h-[264px] w-[240px]" />
        <USkeleton class="h-[264px] w-[240px]" />
      </div>
    </div>

    <div v-else class="space-y-8">
      <div class="space-y-4">
        <h2
          class="text-[20px] font-medium uppercase tracking-widest text-white"
        >
          QR & Wallpaper
        </h2>
        <p class="max-w-160 text-sm leading-[21px] text-[#8b8b8b]">
          Choose your phone model and download the wallpaper that fits perfectly
          on your lock screen or download only QR to share your business card
          wherever you see fit.
        </p>
      </div>

      <div
        class="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_auto_auto] lg:items-start"
      >
        <UFormField
          label="Choose Your Phone Model"
          name="phoneModel"
          class="[&_label]:mb-3 [&_label]:text-sm [&_label]:font-medium [&_label]:text-white"
        >
          <USelectMenu
            v-model="selectedModel"
            :items="phoneModels"
            value-key="value"
            label-key="label"
            :search-input="false"
            class="w-full"
            :ui="{
              base: 'h-[47px] rounded-[4px] border-[#2a2a2a] bg-[#232323] text-sm text-white',
              placeholder: 'text-white/50',
              trailingIcon: 'text-[#8b8b8b]',
            }"
          />
        </UFormField>

        <div class="flex flex-col items-center gap-6">
          <div
            class="flex h-[240px] w-[240px] flex-col items-center justify-center gap-[6px] overflow-hidden rounded-[6px] border border-[#2a2a2a] bg-[#232323] p-4"
          >
            <p class="text-sm text-white/50">Preview</p>
            <div
              class="flex h-40 w-40 items-center justify-center rounded-[4px] bg-[#1c1c1c]"
            >
              <div
                class="h-full max-w-full overflow-hidden rounded-[4px]"
                :style="previewWallpaperFrameStyle"
              >
                <img
                  v-if="wallpaperAssetUrl"
                  :src="wallpaperAssetUrl"
                  alt="Wallpaper preview"
                  class="h-full w-full object-cover"
                />
                <div
                  v-else
                  class="flex h-full w-full items-center justify-center text-xs text-white/50"
                >
                  No wallpaper
                </div>
              </div>
            </div>
            <p class="text-sm text-white">{{ selectedModelConfig.label }}</p>
          </div>

          <UButton
            label="Download Wallpaper"
            icon="i-lucide-download"
            class="rounded-full bg-white px-6 text-dark hover:bg-white/90"
            :loading="isGeneratingWallpaper"
            @click="downloadWallpaper"
          />
        </div>

        <div class="flex flex-col items-center gap-6">
          <button
            type="button"
            class="flex h-[240px] w-[240px] flex-col items-center justify-center gap-[6px] overflow-hidden rounded-[6px] border border-[#2a2a2a] bg-[#232323] p-4 text-left transition hover:border-white/30"
            @click="downloadQr"
          >
            <p class="text-sm text-white/50">Preview</p>
            <div
              class="flex h-40 w-40 items-center justify-center rounded-[4px] bg-[#1c1c1c] p-1"
            >
              <img
                v-if="qrAssetUrl"
                :src="qrAssetUrl"
                alt="QR preview"
                class="h-full w-full rounded-[2px] object-contain"
              />
              <div
                v-else
                class="flex h-full w-full items-center justify-center text-xs text-white/50"
              >
                No QR
              </div>
            </div>
            <p class="text-sm text-white">QR Only</p>
          </button>

          <UButton
            label="Download QR"
            icon="i-lucide-download"
            class="rounded-full bg-white px-6 text-dark hover:bg-white/90"
            :loading="isGeneratingQr"
            @click="downloadQr"
          />
        </div>
      </div>
    </div>
  </div>
</template>
