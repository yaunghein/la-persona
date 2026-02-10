<script setup lang="ts">
import { useQuery, useMutation } from '@tanstack/vue-query';
import type { FormSubmitEvent } from '#ui/types';

const emit = defineEmits<{
  continued: [];
}>();

const route = useRoute();
const toast = useToast();
const slug = computed(() => route.params.slug as string);

const { data: card, isLoading } = useQuery<SelectCard>({
  queryKey: ['cards', slug],
  queryFn: () => $fetch(`/api/cards/${slug.value}`),
});

const state = reactive<UpdateCardUpdateRequest>({
  firstName: undefined,
  lastName: undefined,
  position: undefined,
  phone: undefined,
  email: undefined,
  website: undefined,
  note: undefined,
  cardId: undefined,
});

watch(
  card,
  (val) => {
    if (!val) return;
    state.firstName = val.firstName || '';
    state.lastName = val.lastName || '';
    state.position = val.position || '';
    state.phone = val.phone || '';
    state.email = val.email || '';
    state.website = val.website || '';
    state.cardId = val.id;
  },
  { immediate: true }
);

const { mutate: submitRequest, isPending: isSubmitting } = useMutation({
  mutationFn: async (formData: UpdateCardUpdateRequest) => {
    return await $fetch(`/api/cards`, {
      method: 'PATCH',
      body: {
        ...formData,
        id: formData.cardId, //TODO: this is fk up lol refactor
      },
    });
  },
  onSuccess: () => {
    emit('continued');
    toast.add({
      title: 'Updated Successfully',
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
  <div class="bg-elevated/25 rounded-md p-8">
    <!-- <div v-if="isLoading" class="grid grid-cols-2 gap-5">
      <USkeleton v-for="i in 6" :key="i" class="h-12 w-full" />
      <USkeleton class="h-20 col-span-2 w-full" />
    </div> -->
    <h1 class="text-xl font-semibold tracking-[2px] uppercase leading-none">
      Let's get started
    </h1>
    <p class="mt-4 mb-8 text-sm text-muted">
      Create your La Persona business card in two steps.
    </p>

    <UForm
      :state="state"
      :schema="cardUpdateRequestInsertSchema"
      @submit="onSubmit"
      class="space-y-4 grid grid-cols-1 md:grid-cols-2 w-full gap-x-5"
    >
      <UFormField
        label="First Name"
        name="firstName"
        class="text-sm font-semibold"
      >
        <UInput
          v-model="state.firstName"
          variant="soft"
          class="w-full"
          size="xl"
        />
      </UFormField>

      <UFormField label="Last Name" name="lastName">
        <UInput
          v-model="state.lastName"
          variant="soft"
          class="w-full"
          size="xl"
        />
      </UFormField>

      <UFormField label="Professional Title / Role" name="position">
        <UInput
          v-model="state.position"
          variant="soft"
          class="w-full"
          size="xl"
        />
      </UFormField>

      <UFormField label="Phone Number" name="phone">
        <UInput v-model="state.phone" variant="soft" class="w-full" size="xl" />
      </UFormField>

      <UFormField label="Email Address" name="email">
        <UInput v-model="state.email" variant="soft" class="w-full" size="xl" />
      </UFormField>

      <UFormField label="Personal Website / Portfolio" name="website">
        <UInput
          v-model="state.website"
          variant="soft"
          class="w-full"
          size="xl"
        />
      </UFormField>

      <UFormField label="Note (Optional)" name="note" class="md:col-span-2">
        <UTextarea
          v-model="state.note"
          class="w-full"
          placeholder="Tell us about the changes..."
          variant="soft"
          size="xl"
        />
      </UFormField>

      <div class="md:col-span-2 flex justify-end pt-4">
        <UButton
          type="submit"
          class="rounded-full px-4 font-semibold"
          icon="material-symbols:keyboard-double-arrow-right"
          :loading="isSubmitting"
        >
          Continue
        </UButton>
      </div>
    </UForm>
  </div>
</template>
