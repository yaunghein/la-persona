<script setup lang="ts">
import { Application } from '@splinetool/runtime';
import { closestPhoneWallpaperModel } from '~~/shared/constants/phone-wallpaper-models';
import { applyCommunityCardToSpline } from '~/utils/spline-card';
import {
  canvasToPngBlob,
  renderWallpaperCanvas,
  wallpaperFileSegment,
} from '~/utils/wallpaper-image';
import {
  downloadFile,
  isMobileDevice,
  shareFiles,
} from '~/utils/share-or-download';

const props = defineProps<{
  firstName?: string | null;
  lastName?: string | null;
  position?: string | null;
  phone?: string | null;
  phoneCountryCode?: string | null;
  email?: string | null;
  website?: string | null;
  planCode?: string | null;
  splineUrl?: string | null;
  wallpaperUrl?: string | null;
  joinedAt?: string | null;
  cardSlug?: string | null;
}>();

const emit = defineEmits<{
  next: [];
  skip: [];
}>();

const toast = useToast();
const runtimeConfig = useRuntimeConfig();
const downloading = ref(false);
const canvasEl = ref<HTMLCanvasElement | null>(null);
const splineLoading = ref(false);
const splineFailed = ref(false);
let splineApp: Application | null = null;

const cardFields = computed(() => ({
  firstName: props.firstName,
  lastName: props.lastName,
  position: props.position,
  phone: props.phone,
  phoneCountryCode: props.phoneCountryCode,
  email: props.email,
  website: props.website,
  planCode: props.planCode,
  joinedAt: props.joinedAt,
}));

function applyVariables() {
  if (!splineApp) return;
  splineApp.setBackgroundColor('#171717');
  applyCommunityCardToSpline(splineApp, cardFields.value);
}

function disposeSpline() {
  splineApp?.dispose();
  splineApp = null;
}

async function loadSpline() {
  const url = props.splineUrl?.trim();
  if (!import.meta.client || !url) {
    splineFailed.value = !url;
    return;
  }

  await nextTick();
  const canvas = canvasEl.value;
  if (!canvas) return;

  disposeSpline();
  splineLoading.value = true;
  splineFailed.value = false;
  const spline = new Application(canvas);
  splineApp = spline;

  try {
    await spline.load(`${url}?v=${Date.now()}`);
    applyVariables();
  } catch {
    splineFailed.value = true;
    disposeSpline();
  } finally {
    splineLoading.value = false;
  }
}

watch(cardFields, () => applyVariables());
watch(
  () => props.splineUrl,
  () => loadSpline()
);

onMounted(loadSpline);
onBeforeUnmount(disposeSpline);

function wallpaperAssetUrl(path?: string | null) {
  if (!path) return '';
  if (path.startsWith('http')) return path;

  const bucket = runtimeConfig.public.awsBucketName;
  const region = runtimeConfig.public.awsRegion;
  return `https://${bucket}.s3.${region}.amazonaws.com/${path}`;
}

function publicCardUrl() {
  const cardSlug = props.cardSlug?.trim();
  if (!cardSlug) return '';
  const origin =
    runtimeConfig.public.baseUrl ||
    (import.meta.client ? window.location.origin : '');
  return `${origin}/c/${cardSlug}`;
}

async function onDownload() {
  if (downloading.value) return;

  const assetUrl = wallpaperAssetUrl(props.wallpaperUrl);
  const cardUrl = publicCardUrl();
  if (!assetUrl || !cardUrl) {
    toast.add({
      title: 'Wallpaper not ready',
      description: 'You can download it later from your community card page.',
      color: 'neutral',
    });
    emit('skip');
    return;
  }

  downloading.value = true;
  try {
    const mobile = isMobileDevice();
    const matchedModel = mobile
      ? closestPhoneWallpaperModel(
          Math.round(window.screen.width * window.devicePixelRatio),
          Math.round(window.screen.height * window.devicePixelRatio)
        )
      : null;
    const wallpaperProxyUrl = `/api/s3/image-proxy?url=${encodeURIComponent(assetUrl)}`;
    const wallpaperCanvas = await renderWallpaperCanvas({
      wallpaperProxyUrl,
      cardUrl,
      width: matchedModel?.width,
      height: matchedModel?.height,
    });
    const file = {
      blob: await canvasToPngBlob(wallpaperCanvas),
      fileName: `${wallpaperFileSegment(props.cardSlug || '')}-wallpaper${
        matchedModel ? `-${matchedModel.value}` : ''
      }.png`,
    };

    if (mobile) {
      const shared = await shareFiles([file]);
      if (shared === 'cancelled') return;
      if (shared === 'unavailable') downloadFile(file);
      toast.add({
        title: shared === 'shared' ? 'Wallpaper saved' : 'Wallpaper downloaded',
        description:
          shared === 'shared'
            ? `Saved for ${matchedModel?.label}. It’s in your photos if you chose Save Image.`
            : undefined,
        color: 'success',
      });
    } else {
      downloadFile(file);
      toast.add({
        title: 'Wallpaper downloaded',
        color: 'success',
      });
    }

    emit('next');
  } catch (error: any) {
    toast.add({
      title: 'Download failed',
      description: error?.message || 'Unable to prepare the wallpaper.',
      color: 'error',
    });
  } finally {
    downloading.value = false;
  }
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div
      class="hide-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto p-6 sm:p-8 lg:px-16 lg:py-10"
    >
      <div
        class="mx-auto flex min-h-0 w-full max-w-120 flex-1 flex-col gap-8 sm:max-w-md"
      >
        <div class="flex flex-col gap-6">
          <h1
            class="text-[1.75rem] font-medium leading-tight tracking-[0.175rem] uppercase text-white"
          >
            Keep your card ready
          </h1>
          <p class="text-sm leading-normal text-[#8b8b8b]">
            Set the lock screen wallpaper on your phone for faster check-in at
            the event and to share your contact with other members faster.
          </p>
          <p class="text-sm leading-normal text-[#8b8b8b]">
            You can always download this wallpaper later from your community
            card page.
          </p>
        </div>

        <div
          class="relative min-h-0 w-full flex-1 overflow-hidden sm:min-h-120"
        >
          <div
            class="absolute top-1/2 left-1/2 size-[200%] -translate-x-1/2 -translate-y-1/2"
          >
            <canvas
              v-show="splineUrl && !splineFailed"
              ref="canvasEl"
              class="absolute inset-0 size-full"
            />
          </div>
          <div
            v-if="splineLoading"
            class="absolute inset-0 flex items-center justify-center"
          >
            <UIcon
              name="i-lucide-loader-circle"
              class="size-6 animate-spin text-[#8b8b8b]"
            />
          </div>
          <p
            v-else-if="!splineUrl || splineFailed"
            class="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-[#8b8b8b]"
          >
            This community card scene is not ready yet.
          </p>
        </div>
      </div>
    </div>

    <CommunityEventOnboardingFooter
      :primary-label="downloading ? 'Preparing...' : 'Download Wallpaper'"
      :primary-disabled="downloading"
      secondary-label="Skip"
      :show-powered-by="false"
      @primary="onDownload"
      @secondary="emit('skip')"
    />
  </div>
</template>
