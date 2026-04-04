<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query';
import { useQRCode } from '@vueuse/integrations/useQRCode';
import { refDebounced, useStorage } from '@vueuse/core';

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
const isWallpaperPreviewModalOpen = ref(false);
const wallpaperPreviewDataUrl = ref('');
const qrOnlyPreviewDataUrl = ref('');
const qrColor = useStorage('wallpaper.qrColor', '#000000');
const qrBorderOpacity = useStorage('wallpaper.qrBorderOpacity', 0);
const qrLayerBgColor = useStorage('wallpaper.qrLayerBgColor', '#ffffff');
const qrLayerBgOpacity = useStorage('wallpaper.qrLayerBgOpacity', 1);

qrBorderOpacity.value = 0;
qrLayerBgOpacity.value = 1;
const debouncedQrColor = refDebounced(qrColor, 120);
const debouncedQrBorderOpacity = refDebounced(qrBorderOpacity, 120);
const debouncedQrLayerBgColor = refDebounced(qrLayerBgColor, 120);
const debouncedQrLayerBgOpacity = refDebounced(qrLayerBgOpacity, 120);

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
  return `${origin}/c/${cardSlug}`;
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
// const qrCodeDataUrl = useQRCode(publicCardUrl, qrCodeOptions);

const previewWallpaperFrameStyle = computed(() => ({
  aspectRatio: `${selectedModelConfig.value.width} / ${selectedModelConfig.value.height}`,
}));

const QR_SIZE_RATIO = 0.3;
const QR_PADDING_RATIO = 0.05;
const QR_IMAGE_CORNER_RADIUS_PX = 16;

/** Fills the frame, draws the QR, and strokes the border — all with the same corner radius (bg was square before). */
function fillStrokeAndDrawQrInRoundedFrame(
  context: CanvasRenderingContext2D,
  styledQr: HTMLCanvasElement,
  qrFrameX: number,
  qrFrameY: number,
  qrFrameSize: number,
  qrX: number,
  qrY: number,
  qrSize: number,
  fillCss: string,
  borderWidth: number,
  strokeCss: string
) {
  const r = Math.min(QR_IMAGE_CORNER_RADIUS_PX, qrFrameSize / 2);

  context.fillStyle = fillCss;
  context.beginPath();
  context.roundRect(qrFrameX, qrFrameY, qrFrameSize, qrFrameSize, r);
  context.fill();

  context.save();
  context.beginPath();
  context.roundRect(qrFrameX, qrFrameY, qrFrameSize, qrFrameSize, r);
  context.clip();
  context.drawImage(styledQr, qrX, qrY, qrSize, qrSize);
  context.restore();

  const half = borderWidth / 2;
  const sx = qrFrameX + half;
  const sy = qrFrameY + half;
  const sw = qrFrameSize - borderWidth;
  const sh = qrFrameSize - borderWidth;
  const strokeR = Math.min(Math.max(0, r - half), sw / 2, sh / 2);

  context.imageSmoothingEnabled = true;
  context.strokeStyle = strokeCss;
  context.lineWidth = borderWidth;
  context.beginPath();
  context.roundRect(sx, sy, sw, sh, strokeR);
  context.stroke();
}

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

function isFinderCell(x: number, y: number, matrixSize: number) {
  const inTopLeft = x <= 6 && y <= 6;
  const inTopRight = x >= matrixSize - 7 && y <= 6;
  const inBottomLeft = x <= 6 && y >= matrixSize - 7;
  return inTopLeft || inTopRight || inBottomLeft;
}

async function createStyledQrCanvas(targetSize: number, colorHex: string) {
  if (!publicCardUrl.value) throw new Error('QR URL unavailable');

  const qrModule = await import('qrcode');
  const qrFactory = (qrModule as any).default || qrModule;
  const qr = qrFactory.create(publicCardUrl.value, {
    errorCorrectionLevel: 'H',
    margin: 0,
  });

  const matrixSize = qr.modules.size as number;
  const matrixData = qr.modules.data as ArrayLike<number | boolean>;
  const moduleSize = targetSize / matrixSize;
  const dotRadius = moduleSize * 0.42;
  const { r, g, b } = hexToRgb(colorHex);

  const qrCanvas = document.createElement('canvas');
  qrCanvas.width = targetSize;
  qrCanvas.height = targetSize;
  const qrContext = qrCanvas.getContext('2d');
  if (!qrContext) throw new Error('QR canvas context unavailable');

  qrContext.fillStyle = `rgba(${r}, ${g}, ${b}, 1)`;
  qrContext.imageSmoothingEnabled = true;
  qrContext.imageSmoothingQuality = 'high';

  for (let y = 0; y < matrixSize; y += 1) {
    for (let x = 0; x < matrixSize; x += 1) {
      const index = y * matrixSize + x;
      const cell = matrixData[index];
      const isDark = cell === true || cell === 1;
      if (!isDark) continue;

      const drawX = x * moduleSize;
      const drawY = y * moduleSize;

      if (isFinderCell(x, y, matrixSize)) {
        qrContext.fillRect(drawX, drawY, moduleSize, moduleSize);
        continue;
      }

      qrContext.beginPath();
      qrContext.arc(
        drawX + moduleSize / 2,
        drawY + moduleSize / 2,
        dotRadius,
        0,
        Math.PI * 2
      );
      qrContext.fill();
    }
  }

  return qrCanvas;
}

async function renderWallpaperCanvas() {
  if (!wallpaperProxyUrl.value || !publicCardUrl.value) {
    throw new Error('Wallpaper preview is incomplete');
  }

  const [image, styledQr] = await Promise.all([
    loadImage(wallpaperProxyUrl.value),
    createStyledQrCanvas(1024, qrColor.value),
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

  fillStrokeAndDrawQrInRoundedFrame(
    context,
    styledQr,
    qrFrameX,
    qrFrameY,
    qrFrameSize,
    qrX,
    qrY,
    qrSize,
    hexToRgba(qrLayerBgColor.value, qrLayerBgOpacity.value),
    borderWidth,
    hexToRgba(qrColor.value, qrBorderOpacity.value)
  );

  return canvas;
}

async function renderQrOnlyCanvas() {
  if (!publicCardUrl.value) throw new Error('QR is not ready');
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
  const styledQr = await createStyledQrCanvas(qrSize, qrColor.value);

  const canvas = document.createElement('canvas');
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('QR canvas context unavailable');

  fillStrokeAndDrawQrInRoundedFrame(
    context,
    styledQr,
    qrFrameX,
    qrFrameY,
    qrFrameSize,
    qrX,
    qrY,
    qrSize,
    hexToRgba(qrLayerBgColor.value, qrLayerBgOpacity.value),
    borderWidth,
    hexToRgba(qrColor.value, qrBorderOpacity.value)
  );

  return canvas;
}

let wallpaperPreviewRenderToken = 0;

watch(
  [
    wallpaperProxyUrl,
    publicCardUrl,
    selectedModel,
    debouncedQrColor,
    debouncedQrBorderOpacity,
    debouncedQrLayerBgColor,
    debouncedQrLayerBgOpacity,
  ],
  async () => {
    if (!wallpaperProxyUrl.value || !publicCardUrl.value) {
      wallpaperPreviewRenderToken += 1;
      isRenderingWallpaperPreview.value = false;
      wallpaperPreviewDataUrl.value = '';
      qrOnlyPreviewDataUrl.value = '';
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
  if (!wallpaperProxyUrl.value || !publicCardUrl.value) {
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
  if (!publicCardUrl.value) {
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
  <div class="rounded-[8px] bg-[#171717] p-4 sm:p-8 mb-17 sm:mb-0">
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

    <div v-else class="space-y-8 grid sm:grid-cols-2">
      <div class="space-y-8">
        <div class="space-y-4">
          <h2
            class="text-md sm:text-xl font-medium uppercase tracking-widest text-white"
          >
            QR & Wallpaper
          </h2>
          <p class="max-w-160 text-sm leading-[21px] text-[#8b8b8b]">
            Choose your phone model and download the wallpaper that fits
            perfectly on your lock screen or download only QR to share your
            business card wherever you see fit.
          </p>
        </div>

        <UFormField
          label="Choose Your Phone Model"
          name="phoneModel"
          class="[&_label]:mb-1 [&_label]:text-sm [&_label]:font-medium [&_label]:text-white"
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
              content: 'bg-[#171717] border border-[#2a2a2a]',
            }"
          />
        </UFormField>

        <div class="space-y-5">
          <div class="w-full max-w-[760px] space-y-7">
            <div class="grid sm:grid-cols-2 gap-5">
              <div
                class="space-y-3 flex sm:static flex-col items-center text-center sm:items-start"
              >
                <p class="text-sm font-medium text-white">QR Color</p>
                <UColorPicker
                  v-model="qrColor"
                  size="sm"
                  class="sm:w-full"
                  aria-label="Pick QR color"
                />
              </div>
              <div
                class="space-y-3 flex sm:static flex-col items-center text-center sm:items-start"
              >
                <p class="text-sm font-medium text-white">Background Color</p>
                <UColorPicker
                  v-model="qrLayerBgColor"
                  size="sm"
                  class="sm:w-full"
                  aria-label="Pick QR background color"
                />
              </div>
            </div>

            <div class="griddd sm:grid-cols-2 gap-5 hidden">
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <p class="text-sm font-medium text-white">Border Opacity</p>
                  <span class="text-xs text-white/60">
                    {{ Math.round(qrBorderOpacity * 100) }}%
                  </span>
                </div>
                <USlider
                  v-model="qrBorderOpacity"
                  :min="0"
                  :max="1"
                  :step="0.05"
                  size="sm"
                  color="neutral"
                  class="w-full"
                />
              </div>
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <p class="text-sm font-medium text-white">
                    Background Opacity
                  </p>
                  <span class="text-xs text-white/60">
                    {{ Math.round(qrLayerBgOpacity * 100) }}%
                  </span>
                </div>
                <USlider
                  v-model="qrLayerBgOpacity"
                  :min="0"
                  :max="1"
                  :step="0.05"
                  size="sm"
                  color="neutral"
                  class="w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="flex items-start justify-center flex-wrap gap-10">
        <div class="flex flex-col items-center gap-6">
          <div
            class="relative flex sm:scale-100 h-[240px] w-[240px] flex-col items-center justify-center gap-[6px] overflow-hidden rounded-[6px] border border-[#2a2a2a] bg-[#232323] p-4"
          >
            <UButton
              size="xl"
              icon="i-lucide-expand"
              color="neutral"
              variant="ghost"
              class="absolute flex items-center justify-center right-2 top-2 z-10 cursor-pointer rounded-full bg-black/35 p-3 scale-[0.65] origin-top-right text-white hover:bg-black/50"
              aria-label="Expand wallpaper preview"
              @click="isWallpaperPreviewModalOpen = true"
            />
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

          <UButton
            label="Download Wallpaper"
            icon="i-lucide-download"
            class="h-10 cursor-pointer rounded-full px-5"
            variant="soft"
            :loading="isGeneratingWallpaper"
            @click="downloadWallpaper"
          />
        </div>

        <div class="flex flex-col items-center gap-6">
          <div
            class="flex sm:scale-100 h-[240px] w-[240px] flex-col items-center justify-center gap-[6px] overflow-hidden rounded-[6px] border border-[#2a2a2a] bg-[#232323] p-4 text-left"
          >
            <p class="text-sm text-white/50">Preview</p>
            <div
              class="flex h-40 w-40 items-center justify-center rounded-[8px] bg-[#1c1c1c] p-1"
            >
              <img
                v-if="qrOnlyPreviewDataUrl"
                :src="qrOnlyPreviewDataUrl"
                alt="QR preview"
                class="h-full w-full rounded-[8px] object-contain"
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
          </div>

          <UButton
            variant="soft"
            label="Download QR"
            icon="i-lucide-download"
            class="h-10 cursor-pointer rounded-full px-5"
            :loading="isGeneratingQr"
            @click="downloadQr"
          />
        </div>
      </div>
    </div>
  </div>

  <UModal
    v-model:open="isWallpaperPreviewModalOpen"
    title="Wallpaper Preview"
    :ui="{
      content:
        'sm:max-w-[560px] rounded-lg border border-[#232323] bg-[#171717] max-h-[90vh]',
      title: 'text-sm font-medium uppercase tracking-widest text-white',
      body: 'px-5 py-4 sm:px-6 sm:py-5',
    }"
  >
    <template #body>
      <div
        class="max-h-[62vh] overflow-y-auto overflow-hidden rounded-lg hide-scrollbar sm:max-h-[75vh]"
      >
        <div class="mx-auto w-full overflow-hidden rounded-lg">
          <div
            class="w-full overflow-hidden rounded-lg"
            :style="previewWallpaperFrameStyle"
          >
            <img
              v-if="wallpaperPreviewDataUrl"
              :src="wallpaperPreviewDataUrl"
              alt="Large wallpaper preview"
              class="h-full w-full object-contain"
            />
            <div
              v-else
              class="flex h-full min-h-[280px] w-full items-center justify-center bg-[#1c1c1c] text-sm text-white/50 sm:min-h-[400px]"
            >
              {{
                isRenderingWallpaperPreview
                  ? 'Preparing preview...'
                  : 'No wallpaper'
              }}
            </div>
          </div>
        </div>
      </div>
      <!-- <div class="mt-5 flex justify-center border-t border-[#2a2a2a] pt-5">
        <UButton
          size="md"
          label="Close"
          color="neutral"
          class="h-10 min-w-44 justify-center rounded-full bg-white px-8 font-medium text-dark hover:bg-white/90"
          @click="isWallpaperPreviewModalOpen = false"
        />
      </div> -->
    </template>
  </UModal>
</template>
