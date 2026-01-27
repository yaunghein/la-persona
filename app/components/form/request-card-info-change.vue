<script setup lang="ts">
import { useQuery, useMutation } from '@tanstack/vue-query';
import type { FormSubmitEvent } from '#ui/types';

const route = useRoute();
const toast = useToast();
const cardId = computed(() => route.params.cardId as string);

const { data: card, isLoading } = useQuery({
  queryKey: ['cards', cardId],
  queryFn: () => $fetch(`/api/cards/${cardId.value}`),
});

const state = reactive<UpdateCardUpdateRequest>({
  firstName: undefined,
  lastName: undefined,
  position: undefined,
  phone: undefined,
  email: undefined,
  website: undefined,
  note: undefined,
  cardId: cardId.value,
});

watch(
  card,
  (newCard: any) => {
    if (newCard) {
      state.firstName = newCard.firstName || '';
      state.lastName = newCard.lastName || '';
      state.position = newCard.position || '';
      state.phone = newCard.phone || '';
      state.email = newCard.email || '';
      state.website = newCard.website || '';
    }
  },
  { immediate: true }
);

const { mutate: submitRequest, isPending: isSubmitting } = useMutation({
  mutationFn: async (formData: UpdateCardUpdateRequest) => {
    return await $fetch(`/api/cards/update-request`, {
      method: 'POST',
      body: formData,
    });
  },
  onSuccess: () => {
    toast.add({
      title: 'Request Submitted',
      description: 'Changes have been requested and are pending review.',
      color: 'success',
    });
  },
  onError: (err: any) => {
    toast.add({
      title: 'Submission Failed',
      description: err.data?.statusMessage || 'Action failed',
      color: 'error',
    });
  },
});

function onSubmit(event: FormSubmitEvent<UpdateCardUpdateRequest>) {
  submitRequest(event.data);
}
</script>

<template>
  <div class="bg-elevated/25 rounded-md p-6 mt-3">
    <div v-if="isLoading" class="grid grid-cols-2 gap-5">
      <USkeleton v-for="i in 6" :key="i" class="h-12 w-full" />
      <USkeleton class="h-20 col-span-2 w-full" />
    </div>

    <UForm
      v-else
      :state="state"
      :schema="cardUpdateRequestInsertSchema"
      @submit="onSubmit"
      class="space-y-4 grid grid-cols-1 md:grid-cols-2 w-full gap-x-5"
    >
      <UFormField label="First Name" name="firstName">
        <UInput v-model="state.firstName" class="w-full" />
      </UFormField>

      <UFormField label="Last Name" name="lastName">
        <UInput v-model="state.lastName" class="w-full" />
      </UFormField>

      <UFormField label="Professional Title / Role" name="position">
        <UInput v-model="state.position" class="w-full" />
      </UFormField>

      <UFormField label="Phone Number" name="phone">
        <UInput v-model="state.phone" class="w-full" />
      </UFormField>

      <UFormField label="Email Address" name="email">
        <UInput v-model="state.email" class="w-full" />
      </UFormField>

      <UFormField label="Personal Website / Portfolio" name="website">
        <UInput v-model="state.website" class="w-full" />
      </UFormField>

      <UFormField label="Note (Optional)" name="note" class="md:col-span-2">
        <UTextarea
          v-model="state.note"
          class="w-full"
          placeholder="Tell us about the changes..."
        />
      </UFormField>

      <div class="md:col-span-2 flex justify-end pt-4">
        <UButton
          type="submit"
          class="rounded-full px-8"
          icon="i-lucide-check"
          :loading="isSubmitting"
        >
          Request Changes
        </UButton>
      </div>
    </UForm>
  </div>
</template>
