<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui';
import { CreateWalkInRequest } from '~~/shared/contracts/event';
import { DEFAULT_PHONE_COUNTRY_CODE } from '~~/shared/utils/phone';

const props = defineProps<{
  eventId: string;
}>();

const open = defineModel<boolean>('open', { default: false });

const toast = useToast();
const { mutateAsync: createWalkIn, isPending } = useCreateWalkInMutation(
  () => props.eventId
);

const emptyState = () => ({
  name: '',
  phone: '',
  phoneCountryCode: DEFAULT_PHONE_COUNTRY_CODE,
  company: '',
  position: '',
  note: '',
});

const state = reactive(emptyState());

const fields = [
  { name: 'company', label: 'Company / Brand Name' },
  { name: 'position', label: 'Job Title' },
] as const;

const inputUi = {
  base: 'h-[47px] rounded-[4px] border-line bg-raised text-sm text-ink placeholder:text-ink/50',
};
const fieldClass =
  '[&_label]:mb-1 [&_label]:text-sm [&_label]:font-medium [&_label]:text-ink';

async function saveWalkIn(event: FormSubmitEvent<CreateWalkInRequest>) {
  try {
    await createWalkIn(event.data);
    toast.add({
      title: 'Checked in',
      description: `${event.data.name} has been checked in.`,
      color: 'success',
    });
    Object.assign(state, emptyState());
    open.value = false;
  } catch (error) {
    toast.add({
      title: 'Could not add attendee',
      description: apiErrorMessage(error),
      color: 'error',
    });
  }
}
</script>

<template>
  <USlideover
    v-model:open="open"
    side="right"
    inset
    title="NO EMAIL CHECK-IN"
    description="For guests without an email. Saving their details checks them&nbsp;in."
    close-icon="i-material-symbols:close-small"
    :ui="{
      content: 'bg-surface',
      header: 'border-b-2 border-raised px-6 py-6',
      title: 'text-sm font-medium tracking-[1.4px] text-ink uppercase',
      description: 'mt-2 text-sm text-subtle',
      body: 'px-6',
    }"
  >
    <template #body>
      <UForm
        id="manual-registration-form"
        :schema="CreateWalkInRequest"
        :state="state"
        class="grid grid-cols-1 gap-5 py-2"
        @submit="saveWalkIn"
      >
        <UFormField label="Full Name" name="name" required :class="fieldClass">
          <UInput v-model="state.name" class="w-full" :ui="inputUi" />
        </UFormField>

        <UFormField label="Phone Number" name="phone" :class="fieldClass">
          <UiPhoneField
            v-model="state.phone"
            v-model:country-code="state.phoneCountryCode"
            name="phone"
            :ui="inputUi"
          />
        </UFormField>

        <UFormField
          v-for="field in fields"
          :key="field.name"
          :label="field.label"
          :name="field.name"
          :class="fieldClass"
        >
          <UInput v-model="state[field.name]" class="w-full" :ui="inputUi" />
        </UFormField>

        <UFormField label="Note" name="note" :class="fieldClass">
          <UTextarea
            v-model="state.note"
            :maxlength="500"
            :rows="3"
            autoresize
            class="w-full"
            :ui="{
              base: 'rounded-[4px] border-line bg-raised text-sm text-ink placeholder:text-ink/50',
            }"
          />
        </UFormField>
      </UForm>
    </template>

    <template #footer>
      <UButton
        type="submit"
        form="manual-registration-form"
        label="Save and check in"
        leading-icon="i-lucide-check"
        color="neutral"
        :loading="isPending"
        class="h-10 cursor-pointer rounded-full bg-ink pr-6 pl-5 text-sm font-medium text-ink-inverse hover:bg-ink/90"
      />
    </template>
  </USlideover>
</template>
