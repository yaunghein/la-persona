<script setup lang="ts">
const props = defineProps<{
  walkInUrl: string;
}>();

const open = defineModel<boolean>('open', { default: false });

const toast = useToast();
const emailInput = ref('');
const isSending = ref(false);
const qrDataUrl = ref('');

const formFieldClass =
  '[&_label]:mb-3 [&_label]:text-sm [&_label]:font-medium [&_label]:text-white';

const inputUi = {
  base: 'h-[47px] rounded-[4px] border-[#2a2a2a] bg-[#232323] text-sm text-white placeholder:text-white/50',
};

watch(
  () => props.walkInUrl,
  async (url) => {
    if (!url || !import.meta.client) return;
    try {
      const qrModule = await import('qrcode');
      const qrFactory =
        (qrModule as { default?: typeof import('qrcode') }).default || qrModule;
      qrDataUrl.value = await qrFactory.toDataURL(url, {
        width: 200,
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
  if (!isOpen) emailInput.value = '';
});

async function sendInvitation() {
  const email = emailInput.value.trim();
  if (!email) {
    toast.add({
      title: 'Email required',
      description: 'Enter an email address to send an invitation.',
      color: 'warning',
    });
    return;
  }

  isSending.value = true;
  try {
    await new Promise((resolve) => setTimeout(resolve, 400));
    toast.add({
      title: 'Invitation queued',
      description: `Walk-in invite will be sent to ${email}.`,
      color: 'success',
    });
    emailInput.value = '';
  } finally {
    isSending.value = false;
  }
}

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
      content: 'bg-[#171717]',
      header: 'border-b-2 border-[#232323] px-6 py-6',
      title: 'text-sm font-medium tracking-[1.4px] text-white uppercase',
      body: 'px-6',
    }"
  >
    <template #body>
      <div class="flex flex-col gap-8 py-8">
        <section class="flex flex-col gap-8">
          <div class="space-y-3">
            <h3 class="text-sm font-medium text-white">Register By QR</h3>
            <p class="text-sm leading-normal text-[#8b8b8b]">
              Ask attendees to scan this QR code to register for this event.
              Once they finish registering, they'll appear in the attendee list.
            </p>
          </div>

          <div class="flex flex-col items-center gap-6">
            <div
              class="flex size-50 items-center justify-center rounded-xl border border-[#232323] bg-dark p-2"
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
                class="size-16 text-[#8b8b8b]"
              />
            </div>
            <UButton
              label="Download QR"
              color="neutral"
              class="h-9 cursor-pointer justify-center rounded-full bg-[#232323] px-5 py-2 text-sm font-medium text-white hover:bg-[#2a2a2a]"
              @click="downloadQr"
            />
          </div>
        </section>

        <div class="h-px w-full bg-[#232323]" />

        <section class="flex flex-col gap-8">
          <div class="space-y-3">
            <h3 class="text-sm font-medium text-white">Register By Email</h3>
            <p class="text-sm leading-normal text-[#8b8b8b]">
              Register the attendee by sending an invite to their emails.
            </p>
          </div>

          <UFormField label="Email Invitation" :class="formFieldClass">
            <UInput
              v-model="emailInput"
              type="email"
              placeholder="may@company.com"
              class="w-full"
              size="xl"
              :ui="inputUi"
            />
          </UFormField>

          <div class="flex justify-end">
            <UButton
              label="Send Invitation"
              leading-icon="i-lucide-send"
              color="neutral"
              :loading="isSending"
              :ui="{ leadingIcon: 'size-5' }"
              class="h-9 cursor-pointer justify-center rounded-full bg-white py-2 pr-6 pl-5 text-sm font-medium text-dark hover:bg-white/90"
              @click="sendInvitation"
            />
          </div>
        </section>
      </div>
    </template>
  </USlideover>
</template>
