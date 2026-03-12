<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query';
import { useQRCode } from '@vueuse/integrations/useQRCode';

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
const isRenderingWallpaperPreview = ref(false);
const wallpaperPreviewDataUrl = ref('');
const qrOnlyPreviewDataUrl = ref('');
const qrColor = ref('#000000');
const qrBorderOpacity = ref(0);
const qrLayerBgColor = ref('#ffffff');
const qrLayerBgOpacity = ref(1);

const { data: card, isLoading } = useQuery<SelectCard>({
  queryKey: ['cards', slug],
  queryFn: () => $fetch<SelectCard>(`/api/cards/${slug.value}` as string),
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
const wallpaperProxyUrl = computed(() => {
  if (!wallpaperAssetUrl.value) return '';
  return `/api/s3/image-proxy?url=${encodeURIComponent(wallpaperAssetUrl.value)}`;
});
const publicCardUrl = computed(() => {
  const cardSlug = card.value?.slug;
  if (!cardSlug) return '';

  const origin =
    runtimeConfig.public.baseUrl ||
    (process.client ? window.location.origin : '');
  return `${origin}/yaunghein/${cardSlug}`;
});
const qrCodeOptions = computed(() => ({
  width: 1024,
  margin: 0,
  errorCorrectionLevel: 'H' as const,
  color: {
    dark: qrColor.value,
    light: '#00000000',
  },
}));
const qrCodeDataUrl = useQRCode(publicCardUrl, qrCodeOptions);

const previewWallpaperFrameStyle = computed(() => ({
  aspectRatio: `${selectedModelConfig.value.width} / ${selectedModelConfig.value.height}`,
}));

const QR_SIZE_RATIO = 0.3;
const QR_PADDING_RATIO = 0;

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
    if (!url.startsWith('data:')) {
      image.crossOrigin = 'anonymous';
    }
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

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '');
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '');
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function createTransparentQrImage(
  qrImage: HTMLImageElement,
  targetSize: number,
  colorHex: string
) {
  const qrCanvas = document.createElement('canvas');
  qrCanvas.width = targetSize;
  qrCanvas.height = targetSize;
  const qrContext = qrCanvas.getContext('2d');
  if (!qrContext) throw new Error('QR canvas context unavailable');

  qrContext.imageSmoothingEnabled = false;
  qrContext.drawImage(qrImage, 0, 0, targetSize, targetSize);

  const imageData = qrContext.getImageData(0, 0, targetSize, targetSize);
  const pixels = imageData.data;
  const { r, g, b } = hexToRgb(colorHex);

  for (let i = 0; i < pixels.length; i += 4) {
    const pr = pixels[i]!;
    const pg = pixels[i + 1]!;
    const pb = pixels[i + 2]!;
    const pa = pixels[i + 3]!;

    const isLightPixel = pr > 245 && pg > 245 && pb > 245;
    if (isLightPixel) {
      pixels[i + 3] = 0;
      continue;
    }

    pixels[i] = r;
    pixels[i + 1] = g;
    pixels[i + 2] = b;
    pixels[i + 3] = pa || 255;
  }

  qrContext.putImageData(imageData, 0, 0);
  return qrCanvas;
}

async function renderWallpaperCanvas() {
  if (!wallpaperProxyUrl.value || !qrCodeDataUrl.value) {
    throw new Error('Wallpaper preview is incomplete');
  }

  const [image, qrImage] = await Promise.all([
    loadImage(wallpaperProxyUrl.value),
    loadImage(qrCodeDataUrl.value),
  ]);
  const { width, height } = selectedModelConfig.value;
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

  const qrSize = Math.round(Math.min(width, height) * QR_SIZE_RATIO);
  const qrPadding = Math.max(12, Math.round(qrSize * QR_PADDING_RATIO));
  const qrFrameSize = qrSize + qrPadding * 2;
  const qrFrameX = (width - qrFrameSize) / 2;
  const qrFrameY = (height - qrFrameSize) / 2;
  const qrX = (width - qrSize) / 2;
  const qrY = (height - qrSize) / 2;
  const borderWidth = Math.max(2, Math.round(qrFrameSize * 0.015));
  const transparentQr = createTransparentQrImage(
    qrImage,
    qrSize,
    qrColor.value
  );

  context.fillStyle = hexToRgba(qrLayerBgColor.value, qrLayerBgOpacity.value);
  context.fillRect(qrFrameX, qrFrameY, qrFrameSize, qrFrameSize);
  context.imageSmoothingEnabled = false;
  context.drawImage(transparentQr, qrX, qrY, qrSize, qrSize);
  context.imageSmoothingEnabled = true;
  context.strokeStyle = hexToRgba(qrColor.value, qrBorderOpacity.value);
  context.lineWidth = borderWidth;
  context.strokeRect(
    qrFrameX + borderWidth / 2,
    qrFrameY + borderWidth / 2,
    qrFrameSize - borderWidth,
    qrFrameSize - borderWidth
  );

  return canvas;
}

async function renderQrOnlyCanvas() {
  if (!qrCodeDataUrl.value) throw new Error('QR is not ready');

  const qrImage = await loadImage(qrCodeDataUrl.value);
  const canvasSize = 1024;
  const frameInset = Math.round(canvasSize * 0.04);
  const qrFrameX = frameInset;
  const qrFrameY = frameInset;
  const qrFrameSize = canvasSize - frameInset * 2;
  const qrPadding = Math.max(12, Math.round(qrFrameSize * QR_PADDING_RATIO));
  const qrSize = qrFrameSize - qrPadding * 2;
  const qrX = (canvasSize - qrSize) / 2;
  const qrY = (canvasSize - qrSize) / 2;
  const borderWidth = Math.max(2, Math.round(qrFrameSize * 0.015));
  const transparentQr = createTransparentQrImage(
    qrImage,
    qrSize,
    qrColor.value
  );

  const canvas = document.createElement('canvas');
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('QR canvas context unavailable');

  context.fillStyle = hexToRgba(qrLayerBgColor.value, qrLayerBgOpacity.value);
  context.fillRect(qrFrameX, qrFrameY, qrFrameSize, qrFrameSize);
  context.imageSmoothingEnabled = false;
  context.drawImage(transparentQr, qrX, qrY, qrSize, qrSize);
  context.imageSmoothingEnabled = true;
  context.strokeStyle = hexToRgba(qrColor.value, qrBorderOpacity.value);
  context.lineWidth = borderWidth;
  context.strokeRect(
    qrFrameX + borderWidth / 2,
    qrFrameY + borderWidth / 2,
    qrFrameSize - borderWidth,
    qrFrameSize - borderWidth
  );

  return canvas;
}

let wallpaperPreviewRenderToken = 0;
watch(
  [
    wallpaperProxyUrl,
    qrCodeDataUrl,
    selectedModel,
    qrColor,
    qrBorderOpacity,
    qrLayerBgColor,
    qrLayerBgOpacity,
  ],
  async () => {
    if (!wallpaperProxyUrl.value || !qrCodeDataUrl.value) {
      wallpaperPreviewDataUrl.value = '';
      return;
    }

    const token = ++wallpaperPreviewRenderToken;
    isRenderingWallpaperPreview.value = true;
    try {
      const [wallpaperCanvas, qrOnlyCanvas] = await Promise.all([
        renderWallpaperCanvas(),
        renderQrOnlyCanvas(),
      ]);
      if (token !== wallpaperPreviewRenderToken) return;
      wallpaperPreviewDataUrl.value = wallpaperCanvas.toDataURL('image/png');
      qrOnlyPreviewDataUrl.value = qrOnlyCanvas.toDataURL('image/png');
    } catch {
      if (token !== wallpaperPreviewRenderToken) return;
      wallpaperPreviewDataUrl.value = '';
      qrOnlyPreviewDataUrl.value = '';
    } finally {
      if (token === wallpaperPreviewRenderToken) {
        isRenderingWallpaperPreview.value = false;
      }
    }
  },
  { immediate: true }
);

async function downloadWallpaper() {
  if (!wallpaperProxyUrl.value || !qrCodeDataUrl.value) {
    toast.add({
      title: 'Wallpaper preview is incomplete',
      description: 'Please ensure wallpaper and QR code are ready.',
      color: 'warning',
    });
    return;
  }

  isGeneratingWallpaper.value = true;
  try {
    const { label } = selectedModelConfig.value;
    const canvas = await renderWallpaperCanvas();

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
  if (!qrCodeDataUrl.value) {
    toast.add({
      title: 'QR is not ready',
      description: 'Please wait for the QR code to render.',
      color: 'warning',
    });
    return;
  }

  isGeneratingQr.value = true;
  try {
    const qrCanvas = await renderQrOnlyCanvas();
    const blob = await new Promise<Blob>((resolve, reject) => {
      qrCanvas.toBlob((result) => {
        if (!result) return reject(new Error('Failed to create QR file'));
        resolve(result);
      }, 'image/png');
    });
    const cardSlug = getSafeFileSegment(card.value?.slug);
    triggerDownloadFromBlob(blob, `${cardSlug}-qr.png`);
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
                class="relative h-full max-w-full overflow-hidden rounded-[4px]"
                :style="previewWallpaperFrameStyle"
              >
                <img
                  v-if="wallpaperPreviewDataUrl"
                  :src="wallpaperPreviewDataUrl"
                  alt="Wallpaper preview"
                  class="h-full w-full object-cover"
                />
                <div
                  v-else
                  class="flex h-full w-full items-center justify-center text-xs text-white/50"
                >
                  {{
                    isRenderingWallpaperPreview
                      ? 'Preparing preview...'
                      : 'No wallpaper'
                  }}
                </div>
              </div>
            </div>
            <p class="text-sm text-white">{{ selectedModelConfig.label }}</p>
          </div>

          <div class="flex items-center gap-2">
            <label
              class="flex items-center gap-2 rounded-full border border-[#2a2a2a] bg-[#232323] px-3 py-2"
            >
              <span class="text-xs text-white/70">QR</span>
              <UColorPicker
                v-model="qrColor"
                size="sm"
                class="min-w-7"
                aria-label="Pick QR color"
              />
            </label>
            <label
              class="flex items-center gap-2 rounded-full border border-[#2a2a2a] bg-[#232323] px-3 py-2"
            >
              <span class="text-xs text-white/70">BG</span>
              <UColorPicker
                v-model="qrLayerBgColor"
                size="sm"
                class="min-w-7"
                aria-label="Pick QR background color"
              />
            </label>
            <label
              class="flex items-center gap-2 rounded-full border border-[#2a2a2a] bg-[#232323] px-3 py-2"
            >
              <span class="text-xs text-white/70">Border</span>
              <input
                v-model.number="qrBorderOpacity"
                type="range"
                min="0"
                max="1"
                step="0.05"
                class="w-16 accent-white"
                aria-label="Adjust QR border opacity"
              />
            </label>
            <label
              class="flex items-center gap-2 rounded-full border border-[#2a2a2a] bg-[#232323] px-3 py-2"
            >
              <span class="text-xs text-white/70">Opacity</span>
              <input
                v-model.number="qrLayerBgOpacity"
                type="range"
                min="0"
                max="1"
                step="0.05"
                class="w-18 accent-white"
                aria-label="Adjust QR background opacity"
              />
            </label>
            <UButton
              label="Download Wallpaper"
              icon="i-lucide-download"
              class="rounded-full bg-white px-6 text-dark hover:bg-white/90"
              :loading="isGeneratingWallpaper"
              @click="downloadWallpaper"
            />
          </div>
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
                v-if="qrOnlyPreviewDataUrl"
                :src="qrOnlyPreviewDataUrl"
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
            <p class="max-w-full truncate text-xs text-white/50">
              {{ publicCardUrl || 'Public URL unavailable' }}
            </p>
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
