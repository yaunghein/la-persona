<script setup lang="ts">
const phoneModels = ['iPhone 15 Pro Max', 'iPhone 15 / 14'];

const selectedModel = ref(phoneModels[0]);
const isGeneratingWallpaper = ref(false);
const isGeneratingQr = ref(false);

const downloadWallpaper = async () => {
  isGeneratingWallpaper.value = true;
  try {
    console.log('Generating wallpaper for:', selectedModel.value);
  } finally {
    isGeneratingWallpaper.value = false;
  }
};

const downloadQr = async () => {
  isGeneratingQr.value = true;
  // Trigger QR generation or download existing
  isGeneratingQr.value = false;
};
</script>

<template>
  <div class="space-y-4 grid w-full gap-x-5 mt-10">
    <div>
      <h2 class="text-xl font-semibold text-white uppercase tracking-tight">
        QR & Wallpaper
      </h2>
      <p class="text-sm text-gray-400 mt-2 max-w-xl">
        Choose your phone model and download the wallpaper that fits perfectly
        on your lock screen or download only QR to share your business card
        wherever you see fit.
      </p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <div class="lg:col-span-5 space-y-4">
        <UFormField
          label="Choose Your Phone Model"
          name="phoneModel"
          class="text-gray-300"
        >
          <USelectMenu
            v-model="selectedModel"
            :items="phoneModels"
            placeholder="Select a model"
            class="w-full"
            size="xl"
          />
        </UFormField>
      </div>

      <div class="lg:col-span-7 flex flex-wrap gap-6">
        <div class="flex-1 min-w-50 flex flex-col items-center">
          <div
            class="relative group aspect-square w-full max-w-45 bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden flex items-center justify-center mb-3"
          >
            image
          </div>
          <p class="text-xs text-gray-500 mb-4">
            {{ phoneModels.find((m) => m === selectedModel) }}
          </p>
          <UButton
            label="Download Wallpaper"
            icon="i-lucide-download"
            color="neutral"
            variant="solid"
            class="rounded-full px-6"
            :loading="isGeneratingWallpaper"
            @click="downloadWallpaper"
          />
        </div>

        <div class="flex-1 min-w-50 flex flex-col items-center">
          <div
            class="relative group aspect-square w-full max-w-45 bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden flex items-center justify-center mb-3"
          >
            image
          </div>
          <p class="text-xs text-gray-500 mb-4">QR Only</p>
          <UButton
            label="Download QR"
            icon="i-lucide-download"
            color="neutral"
            variant="solid"
            class="rounded-full px-6"
            :loading="isGeneratingQr"
            @click="downloadQr"
          />
        </div>
      </div>
    </div>
  </div>
</template>
