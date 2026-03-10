<script setup lang="ts">
import * as z from 'zod';
import type { FormSubmitEvent } from '@nuxt/ui';

const emit = defineEmits<{
  close: [];
  submitted: [];
}>();

const toast = useToast();

const schema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  position: z.string().trim().min(1, 'Professional title / role is required'),
  company: z.string().trim().optional(),
  phone: z.string().trim().min(1, 'Phone number is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
});

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  firstName: '',
  lastName: '',
  position: '',
  company: '',
  phone: '',
  email: '',
});

const submitting = ref(false);

function resetForm() {
  state.firstName = '';
  state.lastName = '';
  state.position = '';
  state.company = '';
  state.phone = '';
  state.email = '';
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  submitting.value = true;
  try {
    await $fetch('/api/contact-exchange/manual', {
      method: 'POST',
      body: event.data,
    });

    toast.add({
      title: 'Contact created',
      description: 'The new contact has been added successfully.',
      color: 'success',
    });

    resetForm();
    emit('submitted');
    emit('close');
  } catch (error: any) {
    toast.add({
      title: 'Failed to create contact',
      description:
        error?.data?.statusMessage ||
        error?.statusMessage ||
        'Please try again.',
      color: 'error',
    });
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <UForm :schema="schema" :state="state" class="space-y-8" @submit="onSubmit">
    <div class="space-y-4">
      <h2 class="text-[20px] font-medium uppercase tracking-widest text-white">
        New Contact
      </h2>
      <p class="text-sm text-[#8b8b8b]">
        Manually add a contact to your contacts list.
      </p>
    </div>

    <div class="grid grid-cols-1 gap-6">
      <UFormField
        label="First Name"
        name="firstName"
        class="[&_label]:mb-3 [&_label]:text-sm [&_label]:font-medium [&_label]:text-white"
      >
        <UInput
          v-model="state.firstName"
          placeholder="Kyaw"
          class="w-full"
          :ui="{
            base: 'h-[47px] rounded-[4px] border-[#2a2a2a] bg-[#232323] text-sm text-white placeholder:text-white/50',
          }"
        />
      </UFormField>

      <UFormField
        label="Last Name"
        name="lastName"
        class="[&_label]:mb-3 [&_label]:text-sm [&_label]:font-medium [&_label]:text-white"
      >
        <UInput
          v-model="state.lastName"
          placeholder="Gyi"
          class="w-full"
          :ui="{
            base: 'h-[47px] rounded-[4px] border-[#2a2a2a] bg-[#232323] text-sm text-white placeholder:text-white/50',
          }"
        />
      </UFormField>

      <UFormField
        label="Professional Title / Role"
        name="position"
        class="[&_label]:mb-3 [&_label]:text-sm [&_label]:font-medium [&_label]:text-white"
      >
        <UInput
          v-model="state.position"
          placeholder="Senior Designer"
          class="w-full"
          :ui="{
            base: 'h-[47px] rounded-[4px] border-[#2a2a2a] bg-[#232323] text-sm text-white placeholder:text-white/50',
          }"
        />
      </UFormField>

      <UFormField
        label="Company / Brand Name"
        name="company"
        class="[&_label]:mb-3 [&_label]:text-sm [&_label]:font-medium [&_label]:text-white"
      >
        <UInput
          v-model="state.company"
          placeholder="Acme Inc."
          class="w-full"
          :ui="{
            base: 'h-[47px] rounded-[4px] border-[#2a2a2a] bg-[#232323] text-sm text-white placeholder:text-white/50',
          }"
        />
      </UFormField>

      <UFormField
        label="Phone Number"
        name="phone"
        class="[&_label]:mb-3 [&_label]:text-sm [&_label]:font-medium [&_label]:text-white"
      >
        <UInput
          v-model="state.phone"
          placeholder="+1 (555) 123-4567"
          class="w-full"
          :ui="{
            base: 'h-[47px] rounded-[4px] border-[#2a2a2a] bg-[#232323] text-sm text-white placeholder:text-white/50',
          }"
        />
      </UFormField>

      <UFormField
        label="Email Address"
        name="email"
        class="[&_label]:mb-3 [&_label]:text-sm [&_label]:font-medium [&_label]:text-white"
      >
        <UInput
          v-model="state.email"
          type="email"
          placeholder="john@example.com"
          class="w-full"
          :ui="{
            base: 'h-[47px] rounded-[4px] border-[#2a2a2a] bg-[#232323] text-sm text-white placeholder:text-white/50',
          }"
        />
      </UFormField>
    </div>

    <div class="flex justify-end gap-2">
      <UButton
        type="submit"
        :loading="submitting"
        color="neutral"
        class="rounded-full bg-white px-6 font-medium text-dark hover:bg-white/90"
      >
        <template #leading>
          <UIcon name="i-lucide-plus" class="size-4" />
        </template>
        Create New Contact
      </UButton>
    </div>
  </UForm>
</template>
