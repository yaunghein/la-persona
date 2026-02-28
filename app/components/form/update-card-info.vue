<script setup lang="ts">
import imageCompression from 'browser-image-compression';
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import type { FormSubmitEvent } from '#ui/types';

const route = useRoute();
const queryClient = useQueryClient();
const slug = computed(() => route.params.slug);
const runtimeConfig = useRuntimeConfig();
const toast = useToast();

const selectedFile = ref<File | null>(null);
const localPreviewUrl = ref<string | null>(null);

const { data: card, isLoading } = useQuery<SelectCard>({
  queryKey: ['cards', slug],
  queryFn: () => $fetch(`/api/cards/${slug.value}`),
});

const state = reactive({
  id: '',
  firstName: '',
  lastName: '',
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
  (val) => {
    if (!val) return;
    state.id = val.id ?? '';
    state.firstName = val.firstName ?? '';
    state.lastName = val.lastName ?? '';
    state.position = val.position ?? '';
    state.company = val.company ?? '';
    state.phone = val.phone ?? '';
    state.email = val.email ?? '';
    state.website = val.website ?? '';
    state.avatarUrl = val.avatarUrl ?? '';
    state.socials = JSON.parse(JSON.stringify(val.socials || []));
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

function triggerFilePicker() {
  const input = document.getElementById('avatar-input') as HTMLInputElement | null;
  input?.click();
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
        id: card.value?.id,
      },
    });
  },
  onSuccess: () => {
    clearSelection();
    queryClient.invalidateQueries({ queryKey: ['cards', slug.value] });
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
  <div class="rounded-[8px] bg-[#171717] p-8">
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
      <div class="space-y-4">
        <h2 class="text-[20px] font-medium uppercase tracking-widest text-white">
          Contact Information
        </h2>
        <p class="max-w-160 text-sm leading-[21px] text-[#8b8b8b]">
          This information will be visible on your public profile page and
          exchange contact feature. Please share only what you are comfortable.
        </p>
      </div>

      <div class="flex items-center gap-6 pt-1">
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

        <div class="flex flex-col gap-3">
          <div class="flex items-center gap-2">
            <input
              type="file"
              id="avatar-input"
              class="hidden"
              accept="image/*"
              @change="onFileChange"
            />
            <UButton
              label="Upload Photo"
              icon="i-lucide-upload"
              color="neutral"
              variant="soft"
              size="sm"
              class="rounded-full bg-[#232323] px-4 text-white hover:bg-[#2a2a2a]"
              @click="triggerFilePicker"
            />
            <span
              v-if="selectedFile"
              class="text-xs text-primary-500 font-medium"
              >Ready to upload</span
            >
          </div>
          <p class="text-xs text-[#8b8b8b]">JPG, PNG or WebP. Max 800KB.</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
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
          label="Company / Brand Name"
          name="company"
          class="[&_label]:mb-3 [&_label]:text-sm [&_label]:font-medium [&_label]:text-white"
        >
          <UInput
            v-model="state.company"
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
      </div>

      <div class="space-y-4 pt-6">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-medium text-white">
            Social / Professional Links
          </h3>
          <UButton
            label="Add Link"
            icon="i-lucide-plus"
            size="xs"
            variant="soft"
            class="rounded-full bg-[#232323] px-3 text-white hover:bg-[#2a2a2a]"
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
              :ui="{
                base: 'h-[47px] rounded-[4px] border-[#2a2a2a] bg-[#232323] text-sm text-white',
              }"
            />
          </UFormField>
          <UFormField class="flex-1" :name="`socials.${index}.value`">
            <UInput
              v-model="link.value"
              placeholder="URL"
              class="w-full"
              :ui="{
                base: 'h-[47px] rounded-[4px] border-[#2a2a2a] bg-[#232323] text-sm text-white placeholder:text-white/50',
              }"
            />
          </UFormField>
          <UButton
            icon="i-lucide-x"
            color="error"
            variant="ghost"
            class="text-[#8b8b8b] hover:bg-[#232323]"
            @click="removeLink(index)"
          />
        </div>
      </div>

      <div class="flex justify-end pt-8">
        <UButton
          :to="`/yaunghein/${slug}`"
          target="_blank"
          color="neutral"
          variant="ghost"
          icon="i-lucide-eye"
          class="mr-3 rounded-full px-4 text-[#8b8b8b] hover:bg-[#232323] hover:text-white"
        >
          Preview Your Card
        </UButton>
        <UButton
          type="submit"
          size="lg"
          class="rounded-full bg-[#232323] px-6 text-white hover:bg-[#2a2a2a]"
          icon="i-lucide-square-pen"
          :loading="isSaving"
        >
          Save
        </UButton>
      </div>
    </UForm>
  </div>
</template>
