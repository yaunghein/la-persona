<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui';
import { format } from 'date-fns';
import {
  UpdateContactRequest,
  type ContactEvent,
  type ContactSummary,
} from '~~/shared/contracts/contact';

const props = defineProps<{
  contact: ContactSummary;
  /** Events the card holder registered for. */
  events: ContactEvent[];
  eventsLoading: boolean;
}>();

const emit = defineEmits<{ saved: [] }>();

const toast = useToast();
const { mutateAsync: updateContact, isPending } = useUpdateContactMutation();

// Select items can't use an empty value.
const NO_EVENT = 'none';

const isManual = computed(() => props.contact.source === 'manual');

type EditContactForm = {
  note: string;
  eventId: string;
  name?: string;
  position?: string;
  company?: string;
  phone?: string;
  phoneCountryCode?: string;
  email?: string;
};

// Exchanged contacts keep what the other person shared, so their details stay out of the form.
function toFormState(contact: ContactSummary): EditContactForm {
  const shared = {
    note: contact.note ?? '',
    eventId: contact.event?.id ?? NO_EVENT,
  };
  if (contact.source !== 'manual') return shared;
  return {
    ...shared,
    name: contact.name,
    position: contact.position ?? '',
    company: contact.company ?? '',
    phone: contact.phone,
    phoneCountryCode: contact.phoneCountryCode ?? 'MM',
    email: contact.email ?? '',
  };
}

const state = ref<EditContactForm>(toFormState(props.contact));
watch(
  () => props.contact,
  (contact) => {
    state.value = toFormState(contact);
  }
);

const detailFields = [
  { name: 'name', label: 'Name', placeholder: 'Kyaw Gyi' },
  {
    name: 'position',
    label: 'Professional Title / Role',
    placeholder: 'Senior Designer',
  },
  { name: 'company', label: 'Company / Brand Name', placeholder: 'Acme Inc.' },
] as const;

const eventItems = computed(() => {
  // Keep the current tag selectable even when it isn't in the registered list.
  const current = props.contact.event;
  const events =
    current && !props.events.some((item) => item.id === current.id)
      ? [current, ...props.events]
      : props.events;
  return [
    { label: 'None', value: NO_EVENT },
    ...events.map((item) => ({
      label: `${item.title} · ${format(new Date(item.startsAt), 'd MMM yyyy')}`,
      value: item.id,
    })),
  ];
});

const inputUi = {
  base: 'h-[47px] rounded-[4px] border-line bg-raised text-sm text-ink placeholder:text-ink/50',
};
const fieldClass =
  '[&_label]:mb-1 [&_label]:text-sm [&_label]:font-medium [&_label]:text-ink';

async function onSubmit(event: FormSubmitEvent<UpdateContactRequest>) {
  try {
    await updateContact({
      contactId: props.contact.id,
      input: {
        ...event.data,
        eventId: event.data.eventId === NO_EVENT ? null : event.data.eventId,
      },
    });
    toast.add({ title: 'Contact updated', color: 'success' });
    emit('saved');
  } catch (error: any) {
    toast.add({
      title: 'Failed to update contact',
      description: error?.data?.statusMessage || 'Please try again.',
      color: 'error',
    });
  }
}

defineExpose({ isPending });
</script>

<template>
  <UForm
    id="edit-contact-form"
    :schema="UpdateContactRequest"
    :state="state"
    class="grid grid-cols-1 gap-5"
    @submit="onSubmit"
  >
    <template v-if="isManual">
      <UFormField
        v-for="field in detailFields"
        :key="field.name"
        :label="field.label"
        :name="field.name"
        :class="fieldClass"
      >
        <UInput
          v-model="state[field.name]"
          :placeholder="field.placeholder"
          class="w-full"
          :ui="inputUi"
        />
      </UFormField>

      <UFormField label="Phone Number" name="phone" :class="fieldClass">
        <UiPhoneField
          v-model="state.phone"
          v-model:country-code="state.phoneCountryCode"
          name="phone"
          placeholder="Phone number"
          :ui="inputUi"
        />
      </UFormField>

      <UFormField label="Email Address" name="email" :class="fieldClass">
        <UInput
          v-model="state.email"
          type="email"
          placeholder="john@example.com"
          class="w-full"
          :ui="inputUi"
        />
      </UFormField>
    </template>

    <UFormField label="Where You Met" name="eventId" :class="fieldClass">
      <USelectMenu
        v-model="state.eventId"
        :items="eventItems"
        value-key="value"
        :loading="eventsLoading"
        :search-input="{ placeholder: 'Search events' }"
        class="w-full"
        :ui="{ base: inputUi.base }"
      />
      <template #help>
        <span class="text-xs leading-relaxed text-muted">
          Added automatically when you're checked in at an event, so it can
          occasionally be wrong. Change or clear it&nbsp;here.
        </span>
      </template>
    </UFormField>

    <UFormField label="Note" name="note" :class="fieldClass">
      <UTextarea
        v-model="state.note"
        :maxlength="500"
        :rows="4"
        autoresize
        class="w-full"
        :ui="{
          base: 'rounded-[4px] border-line bg-raised text-sm text-ink placeholder:text-ink/50',
        }"
      />
    </UFormField>
  </UForm>
</template>
