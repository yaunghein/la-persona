<script setup lang="ts">
import * as z from 'zod';
import type { FormSubmitEvent } from '@nuxt/ui';

definePageMeta({
  layout: 'platform',
});

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

const items = [
  {
    label: '3D Card Information',
    slot: '3d',
  },
  {
    label: 'Contact Information',
    slot: 'contact',
  },
  {
    label: 'QR & Wallpapers',
    slot: 'qr',
  },
];
</script>

<template>
  <div class="flex">
    <UButton
      icon="i-lucide-chevron-left"
      size="md"
      color="primary"
      variant="solid"
      class="bg-transparent text-white -mt-[0.15rem]"
    />
    <h1
      class="text-[1.75rem] font-medium tracking-[0.17rem] uppercase leading-none"
    >
      Personal Card
    </h1>
    <div
      class="uppercase text-[0.625rem] leading-none font-bold p-2.5 rounded bg-[#232323] ml-3"
    >
      Founders' Club Edition
    </div>
  </div>
  <p class="leading-none text-sm text-muted -mt-2 ml-8">
    Manage your 3D card information, contact information, QR, and wallpapers.
  </p>

  <UTabs
    :items
    :ui="{
      root: 'items-start',
      list: 'bg-[#171717] max-w-lg',
      indicator: 'bg-[#232323]',
      trigger: 'data-[state=active]:text-white',
    }"
  >
    <template #3d>
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

    <template #contact>
      <div>Contact Slot</div>
    </template>

    <template #qr>
      <div>QR Slot</div>
    </template>
  </UTabs>
</template>
