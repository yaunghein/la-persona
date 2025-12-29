<script setup lang="ts">
import * as z from 'zod';
import type { FormSubmitEvent } from '@nuxt/ui';

const props = defineProps<{
  card: CardDTO;
}>();

const emit = defineEmits<{
  submitted: [];
  nameChanged: [firstName: string, lastName: string];
}>();

const schema = z.object({
  firstName: z.string().min(1, 'First Name is required'),
  lastName: z.string().min(1, 'Last Name is required'),
});

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  firstName: '',
  lastName: '',
});

const firstName = computed(() => props.card.name.split(' ')[0] ?? '');
const lastName = computed(
  () => props.card.name.split(' ').slice(1).join(' ') ?? ''
);

watchEffect(() => {
  state.firstName = firstName.value;
  state.lastName = lastName.value;
});

watch(state, () => {
  emit('nameChanged', state.firstName as string, state.lastName as string);
});

watch(state, () => {});

const pending = ref(false);
const toast = useToast();

async function onSubmit(event: FormSubmitEvent<Schema>) {
  console.log('lol');
  pending.value = true;

  try {
    await $fetch('/api/cards', {
      method: 'PATCH',
      body: {
        id: props.card.id,
        name: `${event.data.firstName} ${event.data.lastName}`,
      },
    });

    toast.add({
      title: 'Success',
      description: 'The card information is updated successfully.',
      color: 'success',
      icon: 'i-heroicons-check-circle',
      progress: false,
    });
  } catch (error: any) {
    toast.add({
      title: 'Failed to exchange contact',
      description: error.statusMessage || 'Please try again.',
      color: 'error',
      icon: 'i-heroicons-x-circle',
      progress: false,
    });
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <div class="min-h-dvh flex items-center justify-center px-5">
    <UCard class="w-full max-w-md">
      <div class="space-y-6">
        <div class="text-center space-y-1">
          <h1 class="text-xl font-semibold">Edit Card</h1>
          <p class="text-sm text-neutral-500">
            Edit information to personaalize your card.
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
              v-model="state.firstName"
              block
              class="w-full"
              :disabled="pending"
            />
          </UFormField>

          <UFormField label="Email" name="email">
            <UInput
              v-model="state.lastName"
              block
              class="w-full"
              :disabled="pending"
            />
          </UFormField>

          <UButton
            type="submit"
            block
            icon="i-lucide-square-pen"
            :loading="pending"
            :disabled="pending"
            class="mt-3 font-bold"
          >
            Update
          </UButton>
        </UForm>
      </div>
    </UCard>
  </div>
</template>
