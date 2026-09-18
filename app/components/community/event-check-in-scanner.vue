<script setup lang="ts">
import { Application } from '@splinetool/runtime';
import type { EventAttendee } from '~~/shared/types/community-event-detail';
import { applyCardToSpline } from '~/utils/spline-card';

// defineOptions({ name: 'CommunityEventCheckInScanner' });

type ScannerState = 'scanning' | 'success' | 'already' | 'not-found';

const props = defineProps<{
  attendees: EventAttendee[];
  eventId: string;
}>();

const emit = defineEmits<{
  checkedIn: [];
}>();

const open = defineModel<boolean>('open', { default: false });

const toast = useToast();
const { withOrganizationQuery } = useOrganizationSlug();

const state = ref<ScannerState>('scanning');
const scannedAttendee = ref<EventAttendee | null>(null);
const scannedCode = ref('');
const cameraError = ref('');
const isSplineLoading = ref(false);
const isLookingUp = ref(false);

const videoEl = ref<HTMLVideoElement | null>(null);
const splineCanvasEl = ref<HTMLCanvasElement | null>(null);

let mediaStream: MediaStream | null = null;
let splineApp: Application | null = null;
let cameraStartId = 0;
let splineLoadId = 0;
let scanTimer: ReturnType<typeof setInterval> | null = null;

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
  scannedCode.value = '';
  cameraError.value = '';
  isLookingUp.value = false;
}

function stopCamera() {
  stopScanLoop();
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
    startScanLoop();
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
    await spline.load(
      `${scannedAttendee.value?.splineUrl || 'https://prod.spline.design/Mu3aeSb6RERM23Q7/scene.splinecode'}?v=${Date.now()}`
    );
    if (loadId !== splineLoadId) {
      spline.dispose();
      return;
    }
    if (scannedAttendee.value) {
      applyCardToSpline(spline, {
        firstName: scannedAttendee.value.firstName,
        lastName: scannedAttendee.value.lastName,
        position: scannedAttendee.value.position || scannedAttendee.value.role,
        phone: scannedAttendee.value.phone,
        email: scannedAttendee.value.email,
        website: scannedAttendee.value.website,
        planCode: scannedAttendee.value.planCode,
      });
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

function stopScanLoop() {
  if (scanTimer) {
    clearInterval(scanTimer);
    scanTimer = null;
  }
}

function startScanLoop() {
  stopScanLoop();
  scanTimer = setInterval(() => {
    void detectQrFromCamera();
  }, 700);
}

async function detectQrFromCamera() {
  if (
    !import.meta.client ||
    state.value !== 'scanning' ||
    isLookingUp.value ||
    !videoEl.value
  ) {
    return;
  }

  const Detector = (
    window as Window & {
      BarcodeDetector?: new (options: { formats: string[] }) => {
        detect: (
          source: CanvasImageSource
        ) => Promise<Array<{ rawValue?: string }>>;
      };
    }
  ).BarcodeDetector;

  if (!Detector) return;

  try {
    const detector = new Detector({ formats: ['qr_code'] });
    const codes = await detector.detect(videoEl.value);
    const value = codes.find((item) => item.rawValue)?.rawValue;
    if (value) await lookupCode(value);
  } catch {
    // Keep scanning.
  }
}

async function lookupCode(code: string) {
  if (isLookingUp.value) return;
  isLookingUp.value = true;
  scannedCode.value = code;
  stopScanLoop();

  try {
    const result = await $fetch<{
      status: 'ready' | 'already' | 'not_found';
      attendee?: {
        id: string;
        name: string;
        role: string;
        company: string;
        splineUrl?: string | null;
        firstName?: string | null;
        lastName?: string | null;
        position?: string | null;
        phone?: string | null;
        email?: string | null;
        website?: string | null;
        planCode?: string | null;
        slug?: string;
        checkedInAt?: string | null;
      };
    }>(`/api/events/${props.eventId}/check-in/preview`, {
      method: 'POST',
      query: withOrganizationQuery(),
      body: { code },
    });

    if (result.status === 'not_found' || !result.attendee) {
      scannedAttendee.value = null;
      state.value = 'not-found';
      return;
    }

    scannedAttendee.value = {
      id: result.attendee.id,
      name: result.attendee.name,
      role: result.attendee.role,
      company: result.attendee.company,
      status: result.status === 'already' ? 'checked_in' : 'registered',
      statusLabel: result.status === 'already' ? 'Already checked in' : 'Registered',
      membershipStatus: 'Active',
      joinedAt: '',
      registeredAt: '',
      checkedInAt: result.attendee.checkedInAt
        ? new Date(result.attendee.checkedInAt).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          })
        : null,
      eventsAttended: 0,
      connectionsMade: 0,
      splineUrl: result.attendee.splineUrl,
      firstName: result.attendee.firstName,
      lastName: result.attendee.lastName,
      position: result.attendee.position,
      phone: result.attendee.phone,
      email: result.attendee.email,
      website: result.attendee.website,
      planCode: result.attendee.planCode,
      cardSlug: result.attendee.slug,
    };

    state.value = result.status === 'already' ? 'already' : 'success';
  } catch {
    scannedAttendee.value = null;
    state.value = 'not-found';
  } finally {
    isLookingUp.value = false;
  }
}

async function resumeScanning() {
  scannedAttendee.value = null;
  scannedCode.value = '';
  disposeSpline();
  state.value = 'scanning';
}

async function confirmCheckIn() {
  if (!scannedCode.value) return;

  try {
    await $fetch(`/api/events/${props.eventId}/check-in`, {
      method: 'POST',
      query: withOrganizationQuery(),
      body: { code: scannedCode.value },
    });
    toast.add({
      title: 'Checked in',
      description: scannedAttendee.value
        ? `${scannedAttendee.value.name} has been checked in.`
        : 'Attendee checked in.',
      color: 'success',
    });
    emit('checkedIn');
    await resumeScanning();
  } catch (error: any) {
    toast.add({
      title: 'Check-in failed',
      description:
        error?.data?.statusMessage || error?.statusMessage || 'Try again.',
      color: 'error',
    });
  }
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
  if (
    el &&
    open.value &&
    (state.value === 'success' || state.value === 'already') &&
    !splineApp
  ) {
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

    if (currentState === 'success' || currentState === 'already') {
      await loadPlaceholderSpline();
      return;
    }

    disposeSpline();
  }
);

async function onManualCode() {
  if (!import.meta.client) return;
  if (
    (window as Window & { BarcodeDetector?: unknown }).BarcodeDetector &&
    !cameraError.value
  ) {
    return;
  }
  const code = window.prompt('Paste the community card URL or slug');
  if (code) await lookupCode(code);
}

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
          <!-- Fallback when BarcodeDetector is unavailable: click to enter a card URL. -->
          <button
            type="button"
            class="absolute inset-0 z-10"
            aria-label="Enter card URL if camera scan is unavailable"
            @click="onManualCode"
          />
        </div>
        <p class="text-sm font-medium text-[#8b8b8b]">
          Place QR code inside frame
        </p>
      </div>

      <div
        v-else-if="state === 'success' || state === 'already'"
        class="relative h-full w-full"
      >
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
