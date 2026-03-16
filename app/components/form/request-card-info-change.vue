<script setup lang="ts">
import { useQuery, useMutation } from '@tanstack/vue-query';
import type { FormSubmitEvent } from '#ui/types';

const route = useRoute();
const toast = useToast();
const slug = computed(() => route.params.slug as string);
const previewUrl = computed(() => `/yaunghein/${slug.value}`);

const { data: card, isLoading } = useQuery<SelectCard>({
  queryKey: ['cards', slug],
  queryFn: () => $fetch(`/api/cards/${slug.value}`),
});

const state = reactive<Partial<UpdateCard>>({
  id: undefined,
  firstName: undefined,
  lastName: undefined,
  position: undefined,
  phone: undefined,
  email: undefined,
  website: undefined,
});

watch(
  card,
  (val) => {
    if (!val) return;
    state.id = val.id;
    state.firstName = val.firstName || '';
    state.lastName = val.lastName || '';
    state.position = val.position || '';
    state.phone = val.phone || '';
    state.email = val.email || '';
    state.website = val.website || '';
  },
  { immediate: true }
);

const { mutate: submitRequest, isPending: isSubmitting } = useMutation({
  mutationFn: async (formData: Record<string, unknown>) => {
    return await $fetch(`/api/cards`, {
      method: 'PATCH',
      body: formData,
    });
  },
  onSuccess: () => {
    toast.add({
      title: 'Info saved successfully.',
      description: 'Your card has been updated.',
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

function onSubmit(event: FormSubmitEvent<Partial<UpdateCard>>) {
  submitRequest(event.data);
}
</script>

<template>
  <div class="rounded-[8px] bg-[#171717] p-8">
    <div v-if="isLoading" class="grid grid-cols-2 gap-5">
      <USkeleton v-for="i in 6" :key="i" class="h-12 w-full" />
      <USkeleton class="h-20 col-span-2 w-full" />
    </div>

    <UForm
      v-else
      :state="state as any"
      :schema="cardUpdateSchema"
      @submit="onSubmit"
      class="grid w-full grid-cols-1 gap-x-6 gap-y-6 md:grid-cols-2"
    >
      <div class="space-y-4 md:col-span-2">
        <h2
          class="text-[20px] font-medium uppercase tracking-widest text-white"
        >
          3D Card Information
        </h2>
        <p class="max-w-160 text-sm leading-[21px] text-[#8b8b8b]">
          This information will be visible on your 3D business card and will
          take 24-36 hours to update. We are working on a more seamless updating
          experience.
        </p>
      </div>

      <UFormField
        label="First Name"
        name="firstName"
        class="[&_label]:mb-3 [&_label]:text-sm [&_label]:font-medium [&_label]:text-white"
      >
        <UInput
          v-model="state.firstName"
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
          class="w-full"
          :ui="{
            base: 'h-[47px] rounded-[4px] border-[#2a2a2a] bg-[#232323] text-sm text-white placeholder:text-white/50',
          }"
        />
      </UFormField>

      <UFormField
        label="Personal Website / Portfolio"
        name="website"
        class="[&_label]:mb-3 [&_label]:text-sm [&_label]:font-medium [&_label]:text-white"
      >
        <UInput
          v-model="state.website"
          class="w-full"
          :ui="{
            base: 'h-[47px] rounded-[4px] border-[#2a2a2a] bg-[#232323] text-sm text-white placeholder:text-white/50',
          }"
        />
      </UFormField>

      <div class="md:col-span-2 flex justify-end gap-3 pt-2">
        <UButton
          :to="previewUrl"
          target="_blank"
          color="neutral"
          variant="ghost"
          icon="i-lucide-eye"
          class="rounded-full px-4 text-[#8b8b8b] hover:bg-[#232323] hover:text-white"
        >
          Preview Your Card
        </UButton>
        <UButton
          type="submit"
          class="rounded-full bg-[#232323] px-4 text-white hover:bg-[#2a2a2a] disabled:bg-white/20 active:bg-[#2a2a2a] cursor-pointer"
          icon="i-lucide-square-pen"
          :loading="isSubmitting"
        >
          Save
        </UButton>
      </div>
    </UForm>
  </div>
</template>
