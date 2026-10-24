<script setup lang="ts">
import { env } from '~~/env';
import { useQRCode } from '@vueuse/integrations/useQRCode';
import { refDebounced, useStorage } from '@vueuse/core';
import { phoneWallpaperModels } from '~~/shared/constants/phone-wallpaper-models';
import {
  renderQrCanvas,
  renderWallpaperCanvas as renderWallpaperImage,
} from '~/features/card/utils/wallpaper-image';

const route = useRoute();
const toast = useToast();
const slug = computed(() => route.params.slug as string);

const phoneModels = phoneWallpaperModels;

const selectedModel = useStorage('wallpaper.phoneModel', phoneModels[0]!.value);
const isGeneratingWallpaper = ref(false);
const isGeneratingQr = ref(false);
const isRenderingWallpaperPreview = ref(false);
const isWallpaperPreviewModalOpen = ref(false);

function openWallpaperPreview() {
  isWallpaperPreviewModalOpen.value = true;
}
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

const { data: card, isLoading } = useCardQuery(slug);

const selectedModelConfig = computed(
  () =>
    phoneModels.find((model) => model.value === selectedModel.value) ??
    phoneModels[0]!
);

const wallpaperAssetUrl = computed(() =>
  resolveObjectStorageUrl(card.value?.wallpaperUrl)
);
const wallpaperProxyUrl = computed(() => {
  if (!wallpaperAssetUrl.value) return '';
  return imageProxyUrl(wallpaperAssetUrl.value);
});
const publicCardUrl = computed(() => {
  const cardSlug = card.value?.slug;
  if (!cardSlug) return '';

  const origin = env.BASE_URL || (process.client ? window.location.origin : '');
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

function getSafeFileSegment(input?: string) {
  return (input || 'card').replace(/[^a-z0-9-_]+/gi, '-').toLowerCase();
}

function wallpaperRenderOptions() {
  return {
    wallpaperProxyUrl: wallpaperProxyUrl.value,
    cardUrl: publicCardUrl.value,
    width: selectedModelConfig.value.width,
    height: selectedModelConfig.value.height,
    qrColor: qrColor.value,
    qrBorderOpacity: qrBorderOpacity.value,
    qrLayerBgColor: qrLayerBgColor.value,
    qrLayerBgOpacity: qrLayerBgOpacity.value,
  };
}

function renderWallpaperCanvas() {
  return renderWallpaperImage(wallpaperRenderOptions());
}

function renderQrOnlyCanvas() {
  return renderQrCanvas({
    cardUrl: publicCardUrl.value,
    qrColor: qrColor.value,
    qrBorderOpacity: qrBorderOpacity.value,
    qrLayerBgColor: qrLayerBgColor.value,
    qrLayerBgOpacity: qrLayerBgOpacity.value,
  });
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
    await shareOrDownloadFile({
      blob,
      fileName: `${cardSlug}-wallpaper-${modelSlug}.png`,
    });
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
    await shareOrDownloadFile({
      blob,
      fileName: `${cardSlug}-qr.png`,
    });
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
  <div class="rounded-[8px] bg-surface p-4 sm:p-8">
    <div v-if="isLoading" class="space-y-8">
      <div class="space-y-3">
        <USkeleton class="h-6 w-52" />
        <USkeleton class="h-4 w-120" />
      </div>
      <div
        class="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_auto_auto] lg:items-start"
      >
        <USkeleton class="h-20 w-full" />
        <USkeleton class="h-66 w-60" />
        <USkeleton class="h-66 w-60" />
      </div>
    </div>

    <div v-else class="space-y-8 grid sm:grid-cols-2">
      <div class="space-y-8">
        <div class="space-y-2">
          <h2
            class="text-md sm:text-xl font-medium uppercase tracking-widest text-ink"
          >
            QR & Wallpaper
          </h2>
          <p class="max-w-160 text-sm leading-5.25 text-subtle">
            Choose your phone model for a perfect-fit wallpaper, or download
            only the QR to share your persona card anywhere.
          </p>
        </div>

        <UFormField
          label="Choose Your Phone Model"
          name="phoneModel"
          class="[&_label]:mb-1 [&_label]:text-sm [&_label]:font-medium [&_label]:text-ink"
        >
          <USelectMenu
            v-model="selectedModel"
            :items="phoneModels"
            value-key="value"
            label-key="label"
            :search-input="{ placeholder: 'Search phone model...' }"
            class="w-full"
            :ui="{
              base: 'h-[47px] rounded-[4px] border-line bg-raised text-sm text-ink',
              placeholder: 'text-ink/50',
              trailingIcon: 'text-subtle',
              content: 'bg-surface border border-line',
            }"
          />
        </UFormField>

        <div class="space-y-5">
          <div class="w-full max-w-190 space-y-7">
            <div class="grid sm:grid-cols-2 gap-5">
              <div
                class="space-y-3 flex sm:static flex-col items-center text-center sm:items-start"
              >
                <p class="text-sm font-medium text-ink">QR Color</p>
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
                <p class="text-sm font-medium text-ink">Background Color</p>
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
                  <p class="text-sm font-medium text-ink">Border Opacity</p>
                  <span class="text-xs text-ink/60">
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
                  <p class="text-sm font-medium text-ink">Background Opacity</p>
                  <span class="text-xs text-ink/60">
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
            class="relative flex h-60 w-60 cursor-pointer flex-col items-center justify-center gap-1.5 overflow-hidden rounded-[6px] border border-line bg-raised p-4 sm:scale-100"
            @click="openWallpaperPreview"
          >
            <UButton
              size="xl"
              icon="i-lucide-expand"
              color="neutral"
              variant="ghost"
              class="absolute flex items-center justify-center right-2 top-2 z-10 cursor-pointer rounded-full bg-black/35 p-3 scale-[0.65] origin-top-right text-white hover:bg-black/50"
              aria-label="Expand wallpaper preview"
              @click.stop="openWallpaperPreview"
            />
            <p class="text-sm text-ink/50">Preview</p>
            <div
              class="flex h-40 w-40 items-center justify-center rounded-[4px] bg-surface-soft"
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
                <USkeleton
                  v-else-if="isRenderingWallpaperPreview"
                  class="h-full w-full rounded-[4px]"
                />
                <div
                  v-else
                  class="flex h-full w-full items-center justify-center text-xs text-ink/50"
                >
                  No wallpaper
                </div>
              </div>
            </div>
            <p class="text-sm text-ink">{{ selectedModelConfig.label }}</p>
          </div>

          <UButton
            label="Download Wallpaper"
            icon="i-lucide-download"
            class="h-10 text-sm cursor-pointer rounded-full px-5"
            variant="soft"
            :loading="isGeneratingWallpaper"
            @click="downloadWallpaper"
          />
        </div>

        <div class="flex flex-col items-center gap-6">
          <div
            class="flex h-60 w-60 flex-col items-center justify-center gap-1.5 overflow-hidden rounded-[6px] border border-line bg-raised p-4 text-left sm:scale-100"
          >
            <p class="text-sm text-ink/50">Preview</p>
            <div
              class="flex h-40 w-40 items-center justify-center rounded-[8px] bg-surface-soft p-1"
            >
              <img
                v-if="qrOnlyPreviewDataUrl"
                :src="qrOnlyPreviewDataUrl"
                alt="QR preview"
                class="h-full w-full rounded-[8px] object-contain"
              />
              <USkeleton
                v-else-if="isRenderingWallpaperPreview"
                class="h-full w-full rounded-[8px]"
              />
              <div
                v-else
                class="flex h-full w-full items-center justify-center text-xs text-ink/50"
              >
                No QR
              </div>
            </div>
            <p class="max-w-full truncate text-xs text-ink/50">
              {{ publicCardUrl || 'Public URL unavailable' }}
            </p>
            <p class="text-sm text-ink">QR Only</p>
          </div>

          <UButton
            variant="soft"
            label="Download QR"
            icon="i-lucide-download"
            class="h-10 text-sm cursor-pointer rounded-full px-5"
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
      content: 'sm:max-w-[560px] rounded-lg bg-surface max-h-[90vh]',
      title: 'text-sm font-medium uppercase tracking-widest text-ink',
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
            <USkeleton
              v-else-if="isRenderingWallpaperPreview"
              class="h-full w-full rounded-lg"
            />
            <div
              v-else
              class="flex h-full min-h-70 w-full items-center justify-center bg-surface-soft text-sm text-ink/50 sm:min-h-100"
            >
              No wallpaper
            </div>
          </div>
        </div>
      </div>
      <!-- <div class="mt-5 flex justify-center border-t border-line pt-5">
        <UButton
          label="Close"
          color="neutral"
          class="h-10 text-sm min-w-44 justify-center rounded-full bg-ink px-8 font-medium text-ink-inverse hover:bg-ink/90"
          @click="isWallpaperPreviewModalOpen = false"
        />
      </div> -->
    </template>
  </UModal>
</template>
