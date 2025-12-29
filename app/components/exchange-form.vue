<script setup lang="ts">
import * as z from 'zod';
import type { FormSubmitEvent } from '@nuxt/ui';

defineProps<{
  card: CardDTO;
}>();

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.email('Invalid email address'),
});

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  name: undefined,
  email: undefined,
});

const pending = ref(false);
const toast = useToast();

async function onSubmit(event: FormSubmitEvent<Schema>) {
  pending.value = true;

  // try {
  //   await $fetch('/api/email/send', {
  //     method: 'POST',
  //     body: {
  //       name: event.data.name,
  //       to: [event.data.email],
  //       subject: `Welcome to La Persona, ${event.data.name.split(' ')[0]} 👋`,
  //     },
  //   });

  //   toast.add({
  //     title: 'Email sent',
  //     description: 'The welcome email was sent successfully.',
  //     color: 'success',
  //     icon: 'i-heroicons-check-circle',
  //     progress: false,
  //   });

  //   state.name = undefined;
  //   state.email = undefined;
  // } catch (error: any) {
  //   toast.add({
  //     title: 'Failed to send email',
  //     description: error.statusMessage || 'Please try again.',
  //     color: 'error',
  //     icon: 'i-heroicons-x-circle',
  //     progress: false,
  //   });
  // } finally {
  //   pending.value = false;
  // }
}
</script>

<template>
  <div class="min-h-dvh flex items-center justify-center px-5">
    <UCard class="w-full max-w-md">
      <div class="space-y-6">
        <div class="text-center space-y-1">
          <h1 class="text-xl font-semibold">Exchange Contact</h1>
          <p class="text-sm text-neutral-500">
            Fill in your contact information to save {{ card.name }}'s contact.
          </p>
        </div>

        <UForm
          :schema="schema"
          :state="state"
          class="space-y-4"
          @submit="onSubmit"
        >
          <UFormField label="Name" name="name">
            <UInput
              v-model="state.name"
              block
              class="w-full"
              placeholder="John Doe"
              :disabled="pending"
            />
          </UFormField>

          <UFormField label="Email" name="email">
            <UInput
              v-model="state.email"
              block
              class="w-full"
              type="email"
              placeholder="john@example.com"
              :disabled="pending"
            />
          </UFormField>

          <UButton
            type="submit"
            block
            icon="i-heroicons-arrow-right"
            :loading="pending"
            :disabled="pending"
            class="mt-3 font-bold"
          >
            Continue
          </UButton>
        </UForm>
      </div>
    </UCard>
  </div>
</template>
