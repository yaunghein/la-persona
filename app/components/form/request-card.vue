<script setup lang="ts">
import imageCompression from 'browser-image-compression';
import { useMutation } from '@tanstack/vue-query';
import type { FormSubmitEvent } from '@nuxt/ui';

const emit = defineEmits<{ close: [] }>();

const toast = useToast();
const selectedFile = ref<File | null>(null);
const localPreviewUrl = ref<string | null>(null);

const state = reactive({
  type: 'new_design' as 'new_design' | 'existing_design',
  name: '',
  position: '',
  company: '',
  phone: '',
  email: '',
  website: '',
  socials: [
    { label: 'LinkedIn', value: '' },
    { label: 'Facebook', value: '' },
  ],
});
const success = ref(false);
const error = ref(false);

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  if (localPreviewUrl.value) URL.revokeObjectURL(localPreviewUrl.value);
  selectedFile.value = file;
  localPreviewUrl.value = URL.createObjectURL(file);
}

const addLink = () => {
  state.socials.push({ label: 'LinkedIn', value: '' });
};
const removeLink = (index: number) => {
  state.socials.splice(index, 1);
};

const { mutate: insertCardRequest, isPending: isLoading } = useMutation({
  mutationFn: async (formData: InsertCardRequest) => {
    await new Promise((r) => setTimeout(r, 3000));
    if (!selectedFile.value) {
      throw new Error('Please upload a payment receipt');
    }

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

    const { type, ...cardData } = formData;
    return await $fetch('/api/cards/new-request', {
      method: 'POST',
      body: {
        type,
        cardData,
        paymentReceiptUrl: fileKey,
      },
    });
  },
  onSuccess: () => {
    if (localPreviewUrl.value) URL.revokeObjectURL(localPreviewUrl.value);
    selectedFile.value = null;
    localPreviewUrl.value = null;
    success.value = true;

    toast.add({
      title: 'Request Submitted',
      description: 'We have received your payment and design request.',
      color: 'success',
    });
  },
  onError: (err: any) => {
    error.value = true;
    toast.add({
      title: 'Submission Failed',
      description:
        err.message || 'An error occurred while uploading. Please try again.',
      color: 'error',
    });
  },
});

function onSubmit(event: FormSubmitEvent<InsertCardRequest>) {
  insertCardRequest(event.data);
}
</script>

<template>
  <div v-if="success" class="h-full flex items-center justify-center">
    <div
      class="text-center flex flex-col items-center justify-center max-w-60 mx-auto"
    >
      <Icon name="i-material-symbols:verified" class="text-[#8BF667] size-24" />
      <div
        class="text-[#8BF667] uppercase text-xl font-semibold leading-none tracking-[2px] mt-8 mb-4"
      >
        Request Received
      </div>
      <div class="text-sm mb-5 leading-normal">
        We've received your details and payment screenshot.
      </div>
      <div class="text-sm text-muted leading-normal mb-8">
        Our team will review everything and contact you within 24 hours to
        confirm the next steps. In the meantime, feel free to take a moment.
        Your next impression is already in progress.
      </div>
      <UButton
        label="Back to Dashboard"
        class="rounded-full font-semibold px-8 cursor-pointer"
        size="lg"
        @click="emit('close')"
      />
    </div>
  </div>
  <div v-else-if="error" class="h-full flex items-center justify-center">
    <div
      class="text-center flex flex-col items-center justify-center max-w-77 mx-auto"
    >
      <Icon name="i-material-symbols:warning" class="text-[#FF3113] size-24" />
      <div
        class="text-[#FF3113] uppercase text-xl font-semibold leading-none tracking-[2px] mt-8 mb-4"
      >
        Something Went Wrong
      </div>
      <div class="text-sm mb-5 leading-normal">
        We couldn't submit your request just yet.
      </div>
      <div class="text-sm text-muted leading-normal mb-8">
        Please check that all required fields are filled and your payment
        receipt is uploaded, then try again. If the issue continues, don’t
        worry, you can reach us directly and we’ll help you right away.
      </div>
      <UButton
        label="Back to Dashboard"
        class="rounded-full font-semibold px-8 cursor-pointer"
        size="lg"
        @click="emit('close')"
      />
    </div>
  </div>
  <UForm v-else :state="state" @submit="onSubmit" class="space-y-8">
    <div>
      <h1 class="text-2xl font-semibold text-white uppercase">
        New Card Request Form
      </h1>
      <p class="text-sm text-muted mt-2">Professional identity, simplified.</p>
    </div>

    <URadioGroup
      v-model="state.type"
      :items="[
        { value: 'new_design', label: 'New Design' },
        { value: 'existing_design', label: 'Existing' },
      ]"
    />

    <div class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UFormField label="Full Name" name="name" required>
          <UInput v-model="state.name" placeholder="John Doe" size="lg" />
        </UFormField>
        <UFormField label="Professional Title / Role" name="position">
          <UInput
            v-model="state.position"
            placeholder="Senior Designer"
            size="lg"
          />
        </UFormField>
      </div>

      <UFormField label="Company / Brand Name" name="company">
        <UInput v-model="state.company" placeholder="Acme Inc." size="lg" />
      </UFormField>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UFormField label="Phone Number" name="phone">
          <UInput
            v-model="state.phone"
            placeholder="+1 (555) 123-4567"
            size="lg"
          />
        </UFormField>
        <UFormField label="Email Address" name="email">
          <UInput
            v-model="state.email"
            placeholder="john@example.com"
            size="lg"
          />
        </UFormField>
      </div>

      <UFormField label="Personal Website / Portfolio" name="website">
        <UInput
          v-model="state.website"
          placeholder="https://johndoe.com"
          size="lg"
        />
      </UFormField>
    </div>

    <div class="space-y-3">
      <div class="flex justify-between items-center">
        <p class="text-sm font-medium text-gray-200">
          Social / Professional Links
        </p>
        <UButton
          icon="i-heroicons-plus"
          size="xs"
          variant="ghost"
          label="Add Link"
          @click="addLink"
        />
      </div>

      <div
        v-for="(link, index) in state.socials"
        :key="index"
        class="flex gap-2"
      >
        <USelectMenu
          v-model="link.label"
          :options="['LinkedIn', 'Twitter', 'Instagram']"
          class="w-32"
          color="neutral"
        />
        <UInput
          v-model="link.value"
          placeholder="URL"
          class="flex-1 w-full"
          color="neutral"
        />
        <UButton
          icon="i-heroicons-x-mark"
          color="error"
          variant="ghost"
          @click="removeLink(index)"
        />
      </div>
    </div>

    <div class="space-y-4 bg-white/5 p-6 rounded-xl border border-white/10">
      <div class="flex flex-col items-center gap-4">
        <p class="text-xs font-bold uppercase tracking-widest text-muted">
          KBZ Pay QR Code
        </p>
        <div
          class="w-48 h-48 bg-white/10 rounded-lg flex items-center justify-center"
        >
          <p class="text-[10px] text-muted">QR Placeholder</p>
        </div>
        <p class="text-xs text-muted">Scan to Pay</p>
      </div>

      <UFormField label="Upload Payment Receipt" required>
        <div class="space-y-4">
          <div
            v-if="localPreviewUrl"
            class="relative w-full h-40 rounded-lg overflow-hidden bg-black/20 border border-white/10"
          >
            <img :src="localPreviewUrl" class="w-full h-full object-contain" />
            <UButton
              icon="i-heroicons-x-mark"
              color="error"
              class="absolute top-2 right-2 rounded-full"
              size="xs"
              @click="
                localPreviewUrl = null;
                selectedFile = null;
              "
            />
          </div>

          <UInput
            type="file"
            accept="image/*"
            icon="i-heroicons-cloud-arrow-up"
            @change="onFileChange"
            color="neutral"
            size="xl"
            class="w-full cursor-pointer"
          />
        </div>
      </UFormField>
    </div>

    <div class="text-center pt-4">
      <p class="text-[10px] text-muted mb-6 px-10">
        Once submitted, our team will review your request and reach out within
        24 hours to confirm.
      </p>
    </div>

    <div class="flex items-center justify-end">
      <UButton
        type="submit"
        label="Submit Request"
        :loading="isLoading"
        icon="i-lucide-check"
        class="rounded-full font-semibold px-8"
        size="lg"
      />
    </div>
  </UForm>
</template>
