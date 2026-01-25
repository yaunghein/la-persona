<script setup lang="ts">
import { z } from 'zod';
import type { FormSubmitEvent } from '@nuxt/ui';

type Schema = z.output<typeof cardUpdateRequestInsertSchema>;

const state = reactive<Partial<Schema>>({
  firstName: undefined,
  lastName: undefined,
  position: undefined,
  phone: undefined,
  email: undefined,
  website: undefined,
  note: undefined,
  cardId: useRoute().params.cardId as string,
});

const toast = useToast();

async function onSubmit(event: FormSubmitEvent<Schema>) {
  try {
    await $fetch(`/api/cards/update-request`, {
      method: 'POST',
      body: event.data,
    });

    toast.add({
      title: 'Request Submitted',
      description:
        'We have received your update request. Please allow 24-36 hours for the changes to reflect.',
      color: 'success',
    });

    // Optional: Reset form or redirect
  } catch (err: any) {
    toast.add({
      title: 'Submission Failed',
      description:
        err.data?.statusMessage ||
        'Something went wrong while submitting your request.',
      color: 'error',
    });
  }
}
</script>

<template>
  <UForm
    :state="state"
    :schema="cardUpdateRequestInsertSchema"
    @submit="onSubmit"
    class="space-y-4 grid grid-cols-2 w-full gap-x-5 mt-10"
  >
    <UFormField label="First Name" name="firstname">
      <UInput class="w-full" v-model="state.firstName" />
    </UFormField>

    <UFormField label="Last Name" name="lastname">
      <UInput class="w-full" v-model="state.lastName" />
    </UFormField>

    <UFormField label="Professional Title / Role" name="role">
      <UInput class="w-full" v-model="state.position" />
    </UFormField>

    <UFormField label="Phone Number" name="phone">
      <UInput class="w-full" v-model="state.phone" />
    </UFormField>

    <UFormField label="Email Address" name="email">
      <UInput class="w-full" v-model="state.email" />
    </UFormField>

    <UFormField label="Personal Website / Portfolio" name="website">
      <UInput class="w-full" v-model="state.website" />
    </UFormField>

    <UFormField label="Note" name="note" class="col-span-2">
      <UInput class="w-full" v-model="state.note" />
    </UFormField>

    <input type="hidden" name="cardId" v-model="state.cardId" />

    <div class="col-span-2 flex justify-end">
      <UButton type="submit" class="rounded-full" icon="i-lucide-check">
        Request Changes
      </UButton>
    </div>
  </UForm>
</template>
