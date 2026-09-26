<script setup lang="ts">
import { Application } from '@splinetool/runtime';
import { applyCardToSpline } from '~/utils/spline-card';

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
}>();

const emit = defineEmits<{
  next: [];
  skip: [];
}>();

const toast = useToast();
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
}));

function applyVariables() {
  if (!splineApp) return;
  applyCardToSpline(splineApp, cardFields.value);
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
watch(() => props.splineUrl, () => loadSpline());

onMounted(loadSpline);
onBeforeUnmount(disposeSpline);

async function onDownload() {
  if (!props.wallpaperUrl) {
    toast.add({
      title: 'Wallpaper not ready',
      description: 'You can download it later from your community card page.',
      color: 'neutral',
    });
    emit('skip');
    return;
  }

  window.open(props.wallpaperUrl, '_blank', 'noopener,noreferrer');
  emit('next');
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div
      class="hide-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto p-6 sm:p-8 lg:px-16 lg:py-10"
    >
      <div
        class="mx-auto flex min-h-0 w-full max-w-120 flex-1 flex-col gap-8 sm:max-w-140"
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
          class="relative min-h-96 w-full flex-1 overflow-hidden rounded-lg bg-[#0b0b0b]"
        >
          <canvas
            v-show="splineUrl && !splineFailed"
            ref="canvasEl"
            class="absolute inset-0 size-full"
          />
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
      primary-label="Download Wallpaper"
      secondary-label="Skip"
      :show-powered-by="false"
      @primary="onDownload"
      @secondary="emit('skip')"
    />
  </div>
</template>
