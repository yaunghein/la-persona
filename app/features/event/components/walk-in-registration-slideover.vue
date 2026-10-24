<script setup lang="ts">
const props = defineProps<{
  walkInUrl: string;
}>();

const open = defineModel<boolean>('open', { default: false });

const toast = useToast();
const colorMode = useColorMode();
const qrDataUrl = ref('');

watch(
  [() => props.walkInUrl, () => colorMode.value],
  async ([url, mode]) => {
    if (!url || !import.meta.client) return;
    try {
      const qrModule = await import('qrcode');
      const qrFactory =
        (qrModule as { default?: typeof import('qrcode') }).default || qrModule;
      qrDataUrl.value = await qrFactory.toDataURL(url, {
        width: 200,
        margin: 1,
        color:
          mode === 'light'
            ? { dark: '#121212', light: '#ededf0' }
            : { dark: '#ffffff', light: '#121212' },
      });
    } catch {
      qrDataUrl.value = '';
    }
  },
  { immediate: true }
);

function downloadQr() {
  if (!qrDataUrl.value) {
    toast.add({
      title: 'QR unavailable',
      description: 'Could not generate QR code.',
      color: 'error',
    });
    return;
  }

  const anchor = document.createElement('a');
  anchor.href = qrDataUrl.value;
  anchor.download = 'event-walk-in-qr.png';
  anchor.click();
}
</script>

<template>
  <USlideover
    v-model:open="open"
    side="right"
    inset
    title="WALK-IN REGISTRATION"
    close-icon="i-material-symbols:close-small"
    :ui="{
      content: 'bg-surface',
      header: 'border-b-2 border-raised px-6 py-6',
      title: 'text-sm font-medium tracking-[1.4px] text-ink uppercase',
      body: 'px-6',
    }"
  >
    <template #body>
      <div class="flex flex-col gap-8 py-8">
        <section class="flex flex-col gap-8">
          <div class="space-y-3">
            <h3 class="text-sm font-medium text-ink">Register By QR</h3>
            <p class="text-sm leading-normal text-subtle">
              Ask attendees to scan this QR code. It opens the event page, where
              they can register. Once they finish, they'll appear in the
              attendee list.
            </p>
          </div>

          <div class="flex flex-col items-center gap-6">
            <div
              class="flex size-50 items-center justify-center rounded-xl border border-raised bg-canvas p-2"
            >
              <img
                v-if="qrDataUrl"
                :src="qrDataUrl"
                alt="Walk-in registration QR code"
                class="size-46 rounded-[4px]"
              />
              <UIcon
                v-else
                name="i-lucide-qr-code"
                class="size-16 text-subtle"
              />
            </div>
          </div>
        </section>
      </div>
    </template>

    <template #footer>
      <UButton
        label="Download QR"
        leading-icon="i-lucide-download"
        color="neutral"
        class="h-10 cursor-pointer rounded-full bg-ink pr-6 pl-5 text-sm font-medium text-ink-inverse hover:bg-ink/90"
        @click="downloadQr"
      />
    </template>
  </USlideover>
</template>
