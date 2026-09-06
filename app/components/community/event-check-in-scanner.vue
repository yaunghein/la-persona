<script setup lang="ts">
import type { EventAttendee } from '~~/shared/types/community-event-detail';

type ScannerState = 'idle' | 'success' | 'already' | 'walkin';

const props = defineProps<{
  attendees: EventAttendee[];
  walkInUrl: string;
}>();

const open = defineModel<boolean>('open', { default: false });

const state = ref<ScannerState>('idle');
const isScanning = ref(false);
const scanCount = ref(0);
const scannedAttendee = ref<EventAttendee | null>(null);
const qrDataUrl = ref('');

watch(
  () => props.walkInUrl,
  async (url) => {
    if (!url || !import.meta.client) return;
    try {
      const qrModule = await import('qrcode');
      const qrFactory = (qrModule as { default?: typeof import('qrcode') }).default || qrModule;
      qrDataUrl.value = await qrFactory.toDataURL(url, {
        width: 220,
        margin: 1,
        color: {
          dark: '#ffffff',
          light: '#121212',
        },
      });
    } catch {
      qrDataUrl.value = '';
    }
  },
  { immediate: true }
);

watch(open, (isOpen) => {
  if (!isOpen) {
    state.value = 'idle';
    isScanning.value = false;
    scannedAttendee.value = null;
  }
});

function showWalkIn() {
  state.value = 'walkin';
}

function closeModal() {
  open.value = false;
}

async function startScan() {
  if (isScanning.value || !props.attendees.length) return;

  isScanning.value = true;
  scanCount.value += 1;

  await new Promise((resolve) => setTimeout(resolve, 1200));

  const checkedInAttendees = props.attendees.filter(
    (a) => a.status === 'checked_in'
  );
  const registeredAttendees = props.attendees.filter(
    (a) => a.status === 'registered'
  );

  if (scanCount.value === 1 && registeredAttendees.length) {
    scannedAttendee.value = registeredAttendees[0] ?? null;
    state.value = 'success';
  } else if (Math.random() > 0.5 && checkedInAttendees.length) {
    scannedAttendee.value = checkedInAttendees[0] ?? null;
    state.value = 'already';
  } else if (registeredAttendees.length) {
    scannedAttendee.value =
      registeredAttendees[scanCount.value % registeredAttendees.length] ?? null;
    state.value = 'success';
  } else {
    scannedAttendee.value = props.attendees[0] ?? null;
    state.value = 'already';
  }

  isScanning.value = false;
}

function resetScanner() {
  state.value = 'idle';
  scannedAttendee.value = null;
}
</script>

<template>
  <UModal
    v-model:open="open"
    :ui="{
      content:
        'sm:max-w-md rounded-lg bg-[#171717]',
      body: 'px-5 py-6 sm:px-6',
    }"
  >
    <template #body>
      <!-- Idle -->
      <div v-if="state === 'idle'" class="flex flex-col items-center gap-6">
        <h2
          class="text-sm font-medium tracking-[1.4px] uppercase text-white"
        >
          QR Scanner
        </h2>
        <div
          class="relative flex aspect-square w-full max-w-64 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-[#232323] bg-dark"
        >
          <UIcon
            name="i-lucide-qr-code"
            class="size-20 text-[#8b8b8b]"
            :class="{ 'animate-pulse': isScanning }"
          />
          <div
            v-if="isScanning"
            class="absolute inset-x-4 top-1/2 h-0.5 -translate-y-1/2 animate-pulse bg-white/60"
          />
        </div>
        <UButton
          label="Start Scan"
          color="neutral"
          :loading="isScanning"
          class="h-10 w-full cursor-pointer justify-center rounded-full bg-white px-6 font-medium text-dark hover:bg-white/90"
          @click="startScan"
        />
        <button
          type="button"
          class="cursor-pointer text-sm text-[#8b8b8b] underline hover:text-white"
          @click="showWalkIn"
        >
          Show Walk-in Registration QR
        </button>
      </div>

      <!-- Success -->
      <div v-else-if="state === 'success' && scannedAttendee" class="space-y-6">
        <h2
          class="text-center text-sm font-medium tracking-[1.4px] uppercase text-white"
        >
          Welcome
        </h2>
        <div class="rounded-lg bg-[#232323] p-5">
          <p class="text-lg font-medium text-white">
            {{ scannedAttendee.name }}
          </p>
          <p class="mt-1 text-sm text-[#8b8b8b]">
            {{ scannedAttendee.role }}
          </p>
          <div class="mt-4 space-y-2 border-t border-[#2a2a2a] pt-4">
            <p
              v-if="scannedAttendee.phone"
              class="text-sm text-[#8b8b8b]"
            >
              {{ scannedAttendee.phone }}
            </p>
            <p
              v-if="scannedAttendee.email"
              class="text-sm text-[#8b8b8b]"
            >
              {{ scannedAttendee.email }}
            </p>
          </div>
        </div>
        <UButton
          label="Got it"
          color="neutral"
          class="h-10 w-full cursor-pointer justify-center rounded-full bg-white px-6 font-medium text-dark hover:bg-white/90"
          @click="closeModal"
        />
      </div>

      <!-- Already checked in -->
      <div
        v-else-if="state === 'already' && scannedAttendee"
        class="space-y-6"
      >
        <div class="text-center">
          <h2
            class="text-sm font-medium tracking-[1.4px] uppercase text-white"
          >
            Already Checked-in
          </h2>
          <p v-if="scannedAttendee.checkedInAt" class="mt-2 text-sm text-[#8b8b8b]">
            {{ scannedAttendee.checkedInAt }}
          </p>
        </div>
        <div class="rounded-lg bg-[#232323] p-5">
          <p class="text-lg font-medium text-white">
            {{ scannedAttendee.name }}
          </p>
          <p class="mt-1 text-sm text-[#8b8b8b]">
            {{ scannedAttendee.role }}
          </p>
          <div class="mt-4 space-y-2 border-t border-[#2a2a2a] pt-4">
            <p
              v-if="scannedAttendee.phone"
              class="text-sm text-[#8b8b8b]"
            >
              {{ scannedAttendee.phone }}
            </p>
            <p
              v-if="scannedAttendee.email"
              class="text-sm text-[#8b8b8b]"
            >
              {{ scannedAttendee.email }}
            </p>
          </div>
        </div>
        <UButton
          label="Got it"
          color="neutral"
          class="h-10 w-full cursor-pointer justify-center rounded-full bg-white px-6 font-medium text-dark hover:bg-white/90"
          @click="closeModal"
        />
      </div>

      <!-- Walk-in QR -->
      <div v-else-if="state === 'walkin'" class="flex flex-col items-center gap-6">
        <h2
          class="text-sm font-medium tracking-[1.4px] uppercase text-white"
        >
          Walk-in Registration
        </h2>
        <p class="text-center text-sm text-[#8b8b8b]">
          Scan this QR code to register on-site.
        </p>
        <div
          class="flex size-56 items-center justify-center rounded-xl border border-[#232323] bg-dark p-2"
        >
          <img
            v-if="qrDataUrl"
            :src="qrDataUrl"
            alt="Walk-in registration QR code"
            class="size-52 rounded-[4px]"
          />
          <UIcon
            v-else
            name="i-lucide-qr-code"
            class="size-16 text-[#8b8b8b]"
          />
        </div>
        <div class="flex w-full flex-col gap-2">
          <UButton
            label="Close"
            color="neutral"
            class="h-10 w-full cursor-pointer justify-center rounded-full bg-white px-6 font-medium text-dark hover:bg-white/90"
            @click="closeModal"
          />
          <UButton
            label="Back to Scanner"
            color="neutral"
            variant="ghost"
            class="h-10 w-full cursor-pointer justify-center text-[#8b8b8b] hover:text-white"
            @click="resetScanner"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
