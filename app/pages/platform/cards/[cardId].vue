<script setup lang="ts">
definePageMeta({
  layout: 'platform',
});

const items = [
  {
    label: '3D Card Information',
    slot: '3d',
  },
  {
    label: 'Contact Information',
    slot: 'contact',
  },
  {
    label: 'QR & Wallpapers',
    slot: 'qr',
  },
];
</script>

<template>
  <div class="flex">
    <UButton
      icon="i-lucide-chevron-left"
      size="md"
      color="primary"
      variant="solid"
      class="bg-transparent text-white -mt-[0.15rem]"
    />
    <h1
      class="text-[1.75rem] font-medium tracking-[0.17rem] uppercase leading-none"
    >
      Personal Card
    </h1>
    <div
      class="uppercase text-[0.625rem] leading-none font-bold p-2.5 rounded bg-[#232323] ml-3"
    >
      Founders' Club Edition
    </div>
  </div>
  <p class="leading-none text-sm text-muted -mt-2 ml-8">
    Manage your 3D card information, contact information, QR, and wallpapers.
  </p>

  <UTabs
    :items
    :ui="{
      root: 'items-start',
      list: 'bg-[#171717] max-w-lg',
      indicator: 'bg-[#232323]',
      trigger: 'data-[state=active]:text-white',
    }"
  >
    <template #3d>
      <FormRequestCardInfoChange />
    </template>

    <template #contact>
      <FormUpdateCardInfo />
    </template>

    <template #qr>
      <div>QR Slot</div>
    </template>
  </UTabs>
</template>
