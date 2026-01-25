<script setup lang="ts">
import { z } from 'zod';
import type { FormSubmitEvent } from '#ui/types';

const items = ref(['Facebook', 'Instagram', 'LinkedIn']);

const toast = useToast();
const loading = ref(false);

type Schema = z.output<typeof cardUpdateSchema>;

const state = reactive<Partial<Schema>>({
  name: '',
  position: '',
  company: undefined,
  phone: undefined,
  email: undefined,
  website: undefined,
  avatarUrl: undefined,
  socials: [],
  id: useRoute().params.cardId as string,
});

const addLink = () => {
  state.socials?.push({ label: '', value: '' });
};

const removeLink = (index: number) => {
  state.socials?.splice(index, 1);
};

async function onSubmit(event: FormSubmitEvent<UpdateCard>) {
  console.log(event.data);
  loading.value = true;
  try {
    console.log(event.data);
    await $fetch('/api/cards', {
      method: 'PATCH',
      body: event.data,
    });

    toast.add({
      title: 'Success',
      description: 'Your contact information has been updated.',
      color: 'success',
    });
  } catch (err: any) {
    toast.add({
      title: 'Update Failed',
      description: err.data?.statusMessage || 'Something went wrong.',
      color: 'error',
    });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <UForm
    :state="state"
    :schema="cardUpdateSchema"
    @submit="onSubmit"
    class="space-y-6"
  >
    <div class="flex items-center gap-4 mb-6">
      <UAvatar
        v-if="state.avatarUrl"
        :src="state.avatarUrl"
        size="xl"
        icon="i-lucide-user"
      />
      <UButton
        label="Upload Photo"
        icon="i-lucide-upload"
        color="neutral"
        variant="ghost"
      />
    </div>

    <div class="grid grid-cols-2 w-full gap-x-5 gap-y-4">
      <UFormField label="Full Name" name="name">
        <UInput class="w-full" v-model="state.name" />
      </UFormField>

      <UFormField label="Professional Title / Role" name="position">
        <UInput class="w-full" v-model="state.position" />
      </UFormField>

      <UFormField label="Company / Brand Name" name="company">
        <UInput class="w-full" v-model="state.company" />
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
    </div>

    <div class="space-y-4 pt-4">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-medium">Social / Professional Links</h3>
        <UButton
          label="Add Link"
          icon="i-lucide-plus"
          size="xs"
          variant="soft"
          @click="addLink"
        />
      </div>

      <div
        v-for="(link, index) in state.socials"
        :key="index"
        class="flex items-end gap-3"
      >
        <UFormField label="Label" class="flex-1">
          <USelectMenu
            placeholder="Select Social Media"
            v-model="link.label"
            :items="items"
            class="w-full"
          />
        </UFormField>
        <UFormField label="URL" class="flex-2">
          <UInput
            v-model="link.value"
            placeholder="https://..."
            class="w-full"
          />
        </UFormField>
        <UButton
          icon="i-lucide-trash"
          color="error"
          variant="ghost"
          class="mb-1"
          @click="removeLink(index)"
        />
      </div>
    </div>

    <input type="hidden" name="cardId" v-model="state.id" />

    <div class="flex justify-end pt-4">
      <UButton
        type="submit"
        class="rounded-full px-8"
        icon="i-lucide-check"
        :loading="loading"
      >
        Save Changes
      </UButton>
    </div>
  </UForm>
</template>
