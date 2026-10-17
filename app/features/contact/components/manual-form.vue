<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui';
import { CreateManualContactRequest } from '~~/shared/contracts/contact';
import { resolvedPhoneFields } from '~~/shared/utils/phone';

const props = withDefaults(
  defineProps<{
    organizationSlug: string;
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
};

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

const inputUi = {
  base: 'h-[47px] rounded-[4px] border-[#2a2a2a] bg-[#232323] text-sm text-white placeholder:text-white/50',
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
</script>

<template>
  <UForm
    :schema="CreateManualContactRequest"
    :state="state"
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
        class="[&_label]:text-sm [&_label]:font-medium [&_label]:text-white"
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
        class="[&_label]:text-sm [&_label]:font-medium [&_label]:text-white"
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
        class="[&_label]:text-sm [&_label]:font-medium [&_label]:text-white"
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
    </div>

    <div class="mb-3 flex justify-end gap-2 sm:mb-0">
      <UButton
        size="xl"
        type="submit"
        :loading="isPending"
        color="neutral"
        class="w-full rounded-full bg-white px-6 font-medium text-dark hover:bg-white/90 sm:w-auto"
      >
        <template #leading>
          <UIcon name="i-lucide-plus" class="size-4" />
        </template>
        Create New Contact
      </UButton>
    </div>
  </UForm>
</template>
