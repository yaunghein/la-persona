<script setup lang="ts">
import type { EventBroadcastKind } from '~~/shared/contracts/event';

const props = defineProps<{
  kind: EventBroadcastKind;
  recipientCount: number;
  lastSentAt: string | null;
  sending: boolean;
}>();

const emit = defineEmits<{ confirm: [] }>();
const open = defineModel<boolean>('open', { default: false });

const copy = computed(() =>
  props.kind === 'reminder'
    ? {
        title: 'Send reminder email',
        audience: 'registered',
        body: 'Each attendee gets their own email with the event details and their QR ticket.',
      }
    : {
        title: 'Send after-event email',
        audience: 'checked-in',
        body: 'Each attendee who checked in gets a thank-you email with ways to keep using their community card.',
      }
);

const lastSentLabel = computed(() =>
  props.lastSentAt ? new Date(props.lastSentAt).toLocaleString() : ''
);
</script>

<template>
  <UModal
    v-model:open="open"
    :title="copy.title"
    :ui="{
      content: 'sm:max-w-md rounded-lg bg-surface',
      title: 'text-sm font-medium uppercase tracking-widest text-ink',
      body: 'px-5 py-4 sm:px-6 sm:py-5',
    }"
  >
    <template #body>
      <div class="flex flex-col gap-4">
        <p class="text-sm leading-normal text-ink">
          Send to
          <strong>{{ recipientCount }}</strong>
          {{ copy.audience }}
          {{ recipientCount === 1 ? 'attendee' : 'attendees' }}?
        </p>
        <p class="text-sm leading-normal text-subtle">{{ copy.body }}</p>
        <UAlert
          v-if="lastSentAt"
          color="warning"
          variant="subtle"
          icon="i-lucide-history"
          :title="`Last sent ${lastSentLabel}`"
          description="Sending again emails everyone on the list again."
        />
        <p
          v-if="recipientCount === 0"
          class="text-sm leading-normal text-subtle"
        >
          There is no one to email yet.
        </p>
        <div class="flex justify-end gap-2 pt-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="ghost"
            class="h-10 text-sm cursor-pointer rounded-full px-5 text-ink hover:bg-raised"
            @click="
              () => {
                open = false;
              }
            "
          />
          <UButton
            :label="lastSentAt ? 'Send Again' : 'Send'"
            leading-icon="i-lucide-send"
            color="neutral"
            :loading="sending"
            :disabled="recipientCount === 0"
            class="h-10 text-sm cursor-pointer rounded-full bg-ink px-6 font-medium text-ink-inverse hover:bg-ink/90"
            @click="emit('confirm')"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
