<script setup lang="ts">
import { env } from '~~/env';
import { communityCardPath } from '~~/shared/utils/routes';
import { renderDottedQrDataUrl } from '~/features/card/utils/wallpaper-image';

const props = defineProps<{
  slug: string;
  name: string;
  detail?: string;
}>();

const dottedQrUrl = ref('');
const cardUrl = computed(
  () => `${env.BASE_URL.replace(/\/$/, '')}${communityCardPath(props.slug)}`
);

watch(
  cardUrl,
  (url) => {
    if (!url || !import.meta.client) {
      dottedQrUrl.value = '';
      return;
    }
    renderDottedQrDataUrl(url).then((dataUrl) => {
      if (cardUrl.value === url) dottedQrUrl.value = dataUrl;
    });
  },
  { immediate: true }
);
</script>

<template>
  <div
    class="w-64 overflow-hidden rounded-[26px] border border-[#3a3a3a] bg-[#2f2f2f] px-2 pt-2 text-center sm:w-96"
  >
    <div class="rounded-[17px] bg-[#1c1c1c] p-2.25">
      <div class="overflow-hidden rounded-lg bg-white p-4">
        <img
          v-if="dottedQrUrl"
          :src="dottedQrUrl"
          :alt="`QR code for ${name || 'this card'}`"
          class="block aspect-square w-full"
        />
        <div v-else class="aspect-square w-full" />
      </div>
    </div>
    <div class="flex flex-col items-center gap-1 px-3 pt-2 pb-3">
      <p v-if="name" class="text-sm text-white">
        {{ name }}
      </p>
      <p v-if="detail" class="text-xs text-white/50">
        {{ detail }}
      </p>
    </div>
  </div>
</template>
