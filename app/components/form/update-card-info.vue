<script setup lang="ts">
import imageCompression from 'browser-image-compression';
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import type { FormSubmitEvent } from '#ui/types';

const route = useRoute();
const queryClient = useQueryClient();
const cardId = computed(() => route.params.cardId);
const runtimeConfig = useRuntimeConfig();
const toast = useToast();

const selectedFile = ref<File | null>(null);
const localPreviewUrl = ref<string | null>(null);

const { data: card, isLoading } = useQuery<SelectCard>({
  queryKey: ['cards', cardId],
  queryFn: () => $fetch(`/api/cards/${cardId.value}`),
});

const state = reactive({
  id: '',
  name: '',
  position: '',
  company: '',
  phone: '',
  email: '',
  website: '',
  avatarUrl: '',
  socials: [] as { label: string; value: string }[],
});

watch(
  card,
  (newCard) => {
    if (newCard) {
      state.id = newCard.id ?? '';
      state.name = newCard.name ?? '';
      state.position = newCard.position ?? '';
      state.company = newCard.company ?? '';
      state.phone = newCard.phone ?? '';
      state.email = newCard.email ?? '';
      state.website = newCard.website ?? '';
      state.avatarUrl = newCard.avatarUrl ?? '';
      state.socials = JSON.parse(JSON.stringify(newCard.socials || []));
    }
  },
  { immediate: true }
);

const displayAvatar = computed(() => {
  if (localPreviewUrl.value) return localPreviewUrl.value;
  if (!state.avatarUrl) return null;
  if (state.avatarUrl.startsWith('http')) return state.avatarUrl;

  const bucket = runtimeConfig.public.awsBucketName;
  const region = runtimeConfig.public.awsRegion;
  return `https://${bucket}.s3.${region}.amazonaws.com/${state.avatarUrl}`;
});

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  if (localPreviewUrl.value) URL.revokeObjectURL(localPreviewUrl.value);
  selectedFile.value = file;
  localPreviewUrl.value = URL.createObjectURL(file);
}

function clearSelection() {
  if (localPreviewUrl.value) URL.revokeObjectURL(localPreviewUrl.value);
  selectedFile.value = null;
  localPreviewUrl.value = null;
  const input = document.getElementById('avatar-input') as HTMLInputElement;
  if (input) input.value = '';
}

function removeCurrentPhoto() {
  clearSelection();
  state.avatarUrl = '';
}

const { mutate: updateCard, isPending: isSaving } = useMutation({
  mutationFn: async (formData: UpdateCard) => {
    let finalAvatarUrl = state.avatarUrl;

    if (selectedFile.value) {
      const compressed = await imageCompression(selectedFile.value, {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 1200,
      });

      const { uploadUrl, fileKey } = await $fetch('/api/s3/presigned', {
        method: 'POST',
        body: {
          fileType: compressed.type,
          fileName: selectedFile.value.name,
        },
      });

      await fetch(uploadUrl, {
        method: 'PUT',
        body: compressed,
        headers: { 'Content-Type': compressed.type },
      });

      finalAvatarUrl = fileKey;
    }

    return await $fetch('/api/cards', {
      method: 'PATCH',
      body: {
        ...formData,
        avatarUrl: finalAvatarUrl,
        id: cardId.value,
      },
    });
  },
  onSuccess: () => {
    clearSelection();
    queryClient.invalidateQueries({ queryKey: ['cards', cardId.value] });
    toast.add({
      title: 'Success',
      description: 'Card updated.',
      color: 'success',
    });
  },
  onError: (err: any) => {
    toast.add({
      title: 'Error',
      description: err.data?.statusMessage || 'Action failed',
      color: 'error',
    });
  },
});

function onSubmit(event: FormSubmitEvent<UpdateCard>) {
  updateCard(event.data);
}

function onFormError(event: any) {
  console.error('Form validation failed:', event.errors);
  toast.add({
    title: 'Validation Error',
    description: 'Please check the required fields.',
    color: 'error',
  });
}

const addLink = () => {
  state.socials.push({ label: '', value: '' });
};
const removeLink = (index: number) => {
  state.socials.splice(index, 1);
};
const items = ['Facebook', 'Instagram', 'LinkedIn', 'Twitter', 'Website'];
</script>

<template>
  <div class="bg-elevated/25 rounded-md mx-auto p-6 mt-3">
    <div v-if="isLoading" class="space-y-8">
      <div class="flex items-center gap-4">
        <USkeleton class="h-24 w-24 rounded-full" />
        <USkeleton class="h-10 w-40" />
      </div>
      <div class="grid grid-cols-2 gap-6">
        <USkeleton v-for="i in 6" :key="i" class="h-12 w-full" />
      </div>
    </div>
    <UForm
      v-else
      :state="state"
      :schema="cardUpdateSchema"
      @submit="onSubmit"
      @error="onFormError"
      class="space-y-8"
    >
      <div class="flex items-center gap-6 pb-6">
        <div class="relative">
          <UAvatar
            :src="displayAvatar || undefined"
            size="3xl"
            icon="i-lucide-user"
            class="object-cover"
          />
          <UButton
            v-if="displayAvatar"
            color="error"
            variant="solid"
            icon="i-lucide-trash-2"
            size="xs"
            class="absolute -bottom-1 -right-1 rounded-full border-2 border-white dark:border-gray-900"
            @click="selectedFile ? clearSelection() : removeCurrentPhoto()"
          />
        </div>

        <div class="flex flex-col gap-2">
          <div class="flex items-center gap-2">
            <input
              type="file"
              id="avatar-input"
              class="hidden"
              accept="image/*"
              @change="onFileChange"
            />
            <UButton
              label="Select Photo"
              icon="i-lucide-image"
              color="neutral"
              variant="subtle"
              size="sm"
              @click="
                () =>
                  (
                    $el.querySelector('#avatar-input') as HTMLInputElement
                  ).click()
              "
            />
            <span
              v-if="selectedFile"
              class="text-xs text-primary-500 font-medium italic"
              >Ready to upload</span
            >
          </div>
          <p class="text-xs text-gray-500">JPG, PNG or WebP. Max 800KB.</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
        <UFormField label="Full Name" name="name">
          <UInput v-model="state.name" class="w-full" />
        </UFormField>
        <UFormField label="Professional Title" name="position">
          <UInput v-model="state.position" class="w-full" />
        </UFormField>
        <UFormField label="Company" name="company">
          <UInput v-model="state.company" class="w-full" />
        </UFormField>
        <UFormField label="Phone" name="phone">
          <UInput v-model="state.phone" class="w-full" />
        </UFormField>
        <UFormField label="Email" name="email">
          <UInput v-model="state.email" class="w-full" />
        </UFormField>
        <UFormField label="Website" name="website">
          <UInput v-model="state.website" class="w-full" />
        </UFormField>
      </div>

      <div class="space-y-4 pt-6">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white">
            Social Links
          </h3>
          <UButton
            label="Add New"
            icon="i-lucide-plus"
            size="xs"
            variant="ghost"
            @click="addLink"
          />
        </div>
        <div
          v-for="(link, index) in state.socials"
          :key="index"
          class="flex gap-3"
        >
          <UFormField class="w-40" :name="`socials.${index}.label`">
            <USelectMenu
              v-model="link.label"
              :items="items"
              class="w-full"
              placeholder="Select Social Media"
            />
          </UFormField>
          <UFormField class="flex-1" :name="`socials.${index}.value`">
            <UInput v-model="link.value" placeholder="URL" class="w-full" />
          </UFormField>
          <UButton
            icon="i-lucide-x"
            color="error"
            variant="ghost"
            @click="removeLink(index)"
          />
        </div>
      </div>

      <div class="flex justify-end pt-8">
        <UButton
          type="submit"
          size="lg"
          class="px-10 rounded-full"
          :loading="isSaving"
        >
          Save Changes
        </UButton>
      </div>
    </UForm>
  </div>
</template>
