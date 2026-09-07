<script setup lang="ts">
import { Application } from '@splinetool/runtime';
import type { EventAttendee } from '~~/shared/types/community-event-detail';

// defineOptions({ name: 'CommunityEventCheckInScanner' });

type ScannerState = 'scanning' | 'success' | 'already' | 'not-found';

const props = defineProps<{
  attendees: EventAttendee[];
}>();

const open = defineModel<boolean>('open', { default: false });

const toast = useToast();

const state = ref<ScannerState>('scanning');
const scannedAttendee = ref<EventAttendee | null>(null);
const cameraError = ref('');
const isSplineLoading = ref(false);
const mockScanCount = ref(0);

const videoEl = ref<HTMLVideoElement | null>(null);
const splineCanvasEl = ref<HTMLCanvasElement | null>(null);

let mediaStream: MediaStream | null = null;
let splineApp: Application | null = null;
let cameraStartId = 0;
let splineLoadId = 0;

const slideoverTitle = computed(() => {
  if (state.value === 'success') return 'Welcome';
  if (state.value === 'already') return 'Already Checked-in';
  return 'QR Scanner';
});

const slideoverDescription = computed(() => {
  if (state.value !== 'already') return undefined;
  return scannedAttendee.value?.checkedInAt || undefined;
});

const closeActionButtonClass =
  'h-13 w-full cursor-pointer justify-center rounded-full bg-[#232323] px-6 text-sm font-bold text-white hover:bg-[#2a2a2a]';

function closeSlideover() {
  open.value = false;
}

function resetScanner() {
  state.value = 'scanning';
  scannedAttendee.value = null;
  cameraError.value = '';
  mockScanCount.value = 0;
}

function stopCamera() {
  mediaStream?.getTracks().forEach((track) => track.stop());
  mediaStream = null;

  if (videoEl.value) {
    videoEl.value.srcObject = null;
  }
}

function disposeSpline() {
  splineApp?.dispose();
  splineApp = null;
  isSplineLoading.value = false;
}

async function startCamera() {
  if (!import.meta.client) return;

  const startId = ++cameraStartId;
  stopCamera();
  cameraError.value = '';

  await nextTick();

  const video = videoEl.value;
  if (!video || startId !== cameraStartId) return;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });

    if (startId !== cameraStartId) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }

    mediaStream = stream;
    video.srcObject = stream;
    // Keep the preview un-mirrored so a held QR stays readable. Front
    // webcams look “backwards” compared to a selfie mirror — do not
    // scaleX(-1) here or later QR detection will see a flipped image.
    video.style.transform = 'none';
    await video.play();
  } catch {
    if (startId !== cameraStartId) return;
    cameraError.value = 'Camera access is needed to scan attendee QR codes.';
  }
}

async function loadPlaceholderSpline() {
  if (!import.meta.client) return;

  const loadId = ++splineLoadId;
  disposeSpline();
  await nextTick();

  const canvas = splineCanvasEl.value;
  if (!canvas || loadId !== splineLoadId) return;

  isSplineLoading.value = true;
  const spline = new Application(canvas);
  splineApp = spline;

  try {
    // TODO: Load the scanned attendee’s Spline scene from their persona
    // card (`splineUrl`) instead of this founder placeholder.
    await spline.load(
      `https://prod.spline.design/Mu3aeSb6RERM23Q7/scene.splinecode?v=${Date.now()}`
    );
    if (loadId !== splineLoadId) {
      spline.dispose();
    }
  } catch {
    if (loadId !== splineLoadId) return;
    toast.add({
      title: 'Unable to load card',
      description: 'The 3D card preview could not be loaded.',
      color: 'error',
    });
  } finally {
    if (loadId === splineLoadId) {
      isSplineLoading.value = false;
    }
  }
}

function resolveMockScan() {
  // TODO: Replace this mock with real QR decoding.
  // After a code is read, look up the attendee and route to:
  // - `success` when they are registered and not yet checked in
  // - `already` when they are already checked in (see already-checked-in UI)
  // - `not-found` when no registration matches the scanned code
  mockScanCount.value += 1;
  const cycle = mockScanCount.value % 3;

  if (cycle === 1) {
    scannedAttendee.value =
      props.attendees.find((attendee) => attendee.status === 'registered') ??
      props.attendees[0] ??
      null;
    state.value = 'success';
    return;
  }

  if (cycle === 2) {
    scannedAttendee.value =
      props.attendees.find((attendee) => attendee.status === 'checked_in') ??
      props.attendees[0] ??
      null;
    state.value = 'already';
    return;
  }

  scannedAttendee.value = null;
  state.value = 'not-found';
}

async function resumeScanning() {
  scannedAttendee.value = null;
  disposeSpline();
  state.value = 'scanning';
}

function confirmCheckIn() {
  if (!scannedAttendee.value) return;

  toast.add({
    title: 'Checked in',
    description: `${scannedAttendee.value.name} has been checked in.`,
    color: 'success',
  });

  resumeScanning();
}

watch(open, (isOpen) => {
  if (isOpen) {
    resetScanner();
    return;
  }

  cameraStartId += 1;
  splineLoadId += 1;
  stopCamera();
  disposeSpline();
  resetScanner();
});

watch(videoEl, async (el) => {
  if (el && open.value && state.value === 'scanning' && !mediaStream) {
    await startCamera();
  }
});

watch(splineCanvasEl, async (el) => {
  if (el && open.value && state.value === 'success' && !splineApp) {
    await loadPlaceholderSpline();
  }
});

watch(
  () => [open.value, state.value] as const,
  async ([isOpen, currentState]) => {
    if (!isOpen) return;

    if (currentState === 'scanning') {
      disposeSpline();
      await startCamera();
      return;
    }

    stopCamera();

    if (currentState === 'success') {
      await loadPlaceholderSpline();
      return;
    }

    disposeSpline();
  }
);

onBeforeUnmount(() => {
  stopCamera();
  disposeSpline();
});
</script>

<template>
  <USlideover
    v-model:open="open"
    side="right"
    inset
    :title="slideoverTitle"
    :description="slideoverDescription"
    close-icon="i-material-symbols:close-small"
    unmount-on-hide
    :ui="{
      content: 'bg-[#171717]',
      header: 'border-b-2 border-[#232323] px-6 py-6',
      title: 'text-sm font-medium tracking-[1.4px] text-white uppercase',
      description: 'mt-2 text-sm text-[#8b8b8b]',
      body: 'flex flex-1 flex-col p-0!',
      footer: 'p-4 sm:p-6  justify-end',
    }"
  >
    <template #body>
      <div
        v-if="state === 'scanning'"
        class="flex h-full flex-col items-center justify-center gap-6 py-8"
      >
        <div
          class="relative size-50 shrink-0 overflow-hidden rounded-xl border border-[#232323] bg-dark"
        >
          <div
            class="absolute inset-2 overflow-hidden rounded-[4px] border border-[#8b8b8b] bg-dark"
          >
            <video
              ref="videoEl"
              class="absolute inset-0 size-full object-cover"
              autoplay
              muted
              playsinline
            />
            <div
              v-if="cameraError"
              class="absolute inset-0 flex items-center justify-center bg-dark px-4 text-center"
            >
              <p class="text-xs leading-normal text-[#8b8b8b]">
                {{ cameraError }}
              </p>
            </div>
          </div>
          <!-- TODO: Remove this mock click once real QR detection is wired. -->
          <button
            type="button"
            class="absolute inset-0 z-10"
            aria-label="Simulate scan"
            @click="resolveMockScan"
          />
        </div>
        <p class="text-sm font-medium text-[#8b8b8b]">
          Place QR code inside frame
        </p>
      </div>

      <div v-else-if="state === 'success'" class="relative h-full w-full">
        <canvas ref="splineCanvasEl" class="size-full" />
        <div
          v-if="isSplineLoading"
          class="absolute inset-0 flex items-center justify-center"
        >
          <UIcon
            name="i-lucide-loader-circle"
            class="size-6 animate-spin text-[#8b8b8b]"
          />
        </div>
      </div>

      <div
        v-else-if="state === 'already'"
        class="flex h-full flex-col items-center justify-center gap-3 py-8 text-center"
      >
        <!-- TODO: After QR decoding is wired, confirm the attendee is
             already checked in and show their live checked-in time here. -->
        <p v-if="scannedAttendee" class="text-lg font-medium text-white">
          {{ scannedAttendee.name }}
        </p>
        <p v-if="scannedAttendee" class="text-sm text-[#8b8b8b]">
          {{ scannedAttendee.role }}
          <template v-if="scannedAttendee.company">
            • {{ scannedAttendee.company }}
          </template>
        </p>
      </div>

      <div
        v-else
        class="flex h-full flex-col items-center justify-center gap-8 py-8"
      >
        <UIcon name="i-lucide-user-x" class="size-12 text-[#8b8b8b]" />
        <div class="flex max-w-108 flex-col items-center gap-3 text-center">
          <p class="text-xl font-medium tracking-[2px] uppercase text-white">
            Attendee not found
          </p>
          <p class="text-sm text-[#8b8b8b]">
            This QR code does not match a registered attendee. Close the scanner
            and register them as a walk-in instead.
          </p>
        </div>
      </div>
    </template>

    <template #footer>
      <div
        v-if="state === 'scanning' || state === 'not-found'"
        class="flex w-full"
      >
        <UButton
          label="Close scanner"
          color="neutral"
          :class="closeActionButtonClass"
          @click="closeSlideover"
        />
      </div>

      <div
        v-else-if="state === 'success'"
        class="flex flex-col w-full items-center justify-end gap-4"
      >
        <UButton
          label="Check-in"
          color="neutral"
          class="h-9 w-full cursor-pointer justify-center rounded-full bg-white py-2 pr-6 pl-5 text-sm font-medium text-dark hover:bg-white/90"
          @click="confirmCheckIn"
        />
        <UButton
          label="Cancel"
          color="neutral"
          variant="ghost"
          class="h-9 cursor-pointer rounded-full px-5 text-sm font-medium text-[#8b8b8b] hover:bg-[#232323] hover:text-white"
          @click="resumeScanning"
        />
      </div>

      <div v-else class="flex w-full justify-end">
        <UButton
          label="Got it"
          color="neutral"
          class="h-9 cursor-pointer justify-center rounded-full bg-[#232323] py-2 pr-6 pl-5 text-sm font-medium text-white hover:bg-[#2a2a2a]"
          @click="resumeScanning"
        />
      </div>
    </template>
  </USlideover>
</template>
