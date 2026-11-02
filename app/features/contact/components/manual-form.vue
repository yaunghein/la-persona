<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui';
import { format } from 'date-fns';
import {
  CreateManualContactRequest,
  type ContactEvent,
} from '~~/shared/contracts/contact';
import { resolvedPhoneFields } from '~~/shared/utils/phone';

const props = withDefaults(
  defineProps<{
    organizationSlug: string;
    /** Events the card holder registered for. */
    events: ContactEvent[];
    eventsLoading: boolean;
    /** `stacked`: one column (slideover). `wide`: three columns (full page). */
    layout?: 'stacked' | 'wide';
  }>(),
  { layout: 'stacked' }
);

const emit = defineEmits<{ created: [] }>();

const toast = useToast();
const { mutateAsync: createContact, isPending } =
  useCreateManualContactMutation(() => props.organizationSlug);

type ManualContactForm = {
  firstName: string;
  lastName: string;
  position: string;
  company: string;
  phone: string;
  phoneCountryCode: string;
  email: string;
  eventId: string;
  note: string;
};

// Select items can't use an empty value.
const NO_EVENT = 'none';

const { state, reset: resetForm } = useFormDraft<ManualContactForm>(
  () => `org:${props.organizationSlug}:manual-contact`,
  () => ({
    firstName: '',
    lastName: '',
    position: '',
    company: '',
    phone: '',
    phoneCountryCode: 'MM',
    email: '',
    eventId: NO_EVENT,
    note: '',
  })
);

const fields = [
  { name: 'firstName', label: 'First Name', placeholder: 'Kyaw' },
  { name: 'lastName', label: 'Last Name', placeholder: 'Gyi' },
  {
    name: 'position',
    label: 'Professional Title / Role',
    placeholder: 'Senior Designer',
  },
  { name: 'company', label: 'Company / Brand Name', placeholder: 'Acme Inc.' },
] as const;

const eventItems = computed(() => [
  { label: 'None', value: NO_EVENT },
  ...props.events.map((item) => ({
    label: `${item.title} · ${format(new Date(item.startsAt), 'd MMM yyyy')}`,
    value: item.id,
  })),
]);

const inputUi = {
  base: 'h-[47px] rounded-[4px] border-line bg-raised text-sm text-ink placeholder:text-ink/50',
};

async function onSubmit(event: FormSubmitEvent<CreateManualContactRequest>) {
  try {
    const phoneFields = resolvedPhoneFields(
      event.data.phone,
      event.data.phoneCountryCode
    );
    await createContact({
      ...event.data,
      phone: phoneFields.phone || event.data.phone,
      phoneCountryCode: phoneFields.phoneCountryCode,
      eventId: event.data.eventId === NO_EVENT ? undefined : event.data.eventId,
    });
    toast.add({
      title: 'Contact created',
      description: 'The new contact has been added successfully.',
      color: 'success',
    });
    resetForm();
    emit('created');
  } catch (error: any) {
    toast.add({
      title: 'Failed to create contact',
      description: error?.data?.statusMessage || 'Please try again.',
      color: 'error',
    });
  }
}

defineExpose({ isPending });
</script>

<template>
  <UForm
    :schema="CreateManualContactRequest"
    :state="state"
    id="manual-contact-form"
    class="space-y-8"
    @submit="onSubmit"
  >
    <div
      class="grid grid-cols-1"
      :class="layout === 'wide' ? 'gap-6 xl:grid-cols-3' : 'gap-5'"
    >
      <UFormField
        v-for="field in fields"
        :key="field.name"
        :label="field.label"
        :name="field.name"
        class="[&_label]:text-sm [&_label]:font-medium [&_label]:text-ink"
        :class="layout === 'wide' ? '[&_label]:mb-3' : '[&_label]:mb-1'"
      >
        <UInput
          v-model="state[field.name]"
          :placeholder="field.placeholder"
          class="w-full"
          :ui="inputUi"
        />
      </UFormField>

      <UFormField
        label="Phone Number"
        name="phone"
        class="[&_label]:text-sm [&_label]:font-medium [&_label]:text-ink"
        :class="layout === 'wide' ? '[&_label]:mb-3' : '[&_label]:mb-1'"
      >
        <UiPhoneField
          v-model="state.phone"
          v-model:country-code="state.phoneCountryCode"
          name="phone"
          placeholder="Phone number"
          :ui="inputUi"
        />
      </UFormField>

      <UFormField
        label="Email Address"
        name="email"
        class="[&_label]:text-sm [&_label]:font-medium [&_label]:text-ink"
        :class="layout === 'wide' ? '[&_label]:mb-3' : '[&_label]:mb-1'"
      >
        <UInput
          v-model="state.email"
          type="email"
          placeholder="john@example.com"
          class="w-full"
          :ui="inputUi"
        />
      </UFormField>

      <UFormField
        label="Where You Met"
        name="eventId"
        class="[&_label]:text-sm [&_label]:font-medium [&_label]:text-ink"
        :class="layout === 'wide' ? '[&_label]:mb-3' : '[&_label]:mb-1'"
      >
        <USelectMenu
          v-model="state.eventId"
          :items="eventItems"
          value-key="value"
          :loading="eventsLoading"
          :search-input="{ placeholder: 'Search events' }"
          class="w-full"
          :ui="{ base: inputUi.base }"
        />
      </UFormField>

      <UFormField
        label="Note"
        name="note"
        class="[&_label]:text-sm [&_label]:font-medium [&_label]:text-ink"
        :class="
          layout === 'wide' ? '[&_label]:mb-3 xl:col-span-3' : '[&_label]:mb-1'
        "
      >
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
    </div>

    <div v-if="layout === 'wide'" class="flex justify-end">
      <UButton
        type="submit"
        label="Create New Contact"
        leading-icon="i-lucide-plus"
        :loading="isPending"
        color="neutral"
        class="h-10 cursor-pointer rounded-full bg-ink pr-6 pl-5 text-sm font-medium text-ink-inverse hover:bg-ink/90"
      />
    </div>
  </UForm>
</template>
