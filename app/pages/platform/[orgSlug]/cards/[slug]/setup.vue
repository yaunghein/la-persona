<script setup lang="ts">
const form = ref<'contact' | 'link'>('contact');
</script>

<template>
  <section>
    <div class="w-44 aspect-[1/0.11] mt-9 mx-auto">
      <IconLogo />
    </div>
    <div class="flex items-start justify-between my-13 w-120 mx-auto relative">
      <div
        class="bg-[#2A2A2A] h-0.5 w-52 left-1/2 top-4.5 -translate-x-1/2 absolute"
      ></div>
      <div class="flex flex-col items-center gap-4">
        <div
          class="w-9 aspect-square rounded-full flex relative bg-[#232323]"
          :class="{
            'bg-white text-dark': form === 'contact',
          }"
        >
          <Icon
            name="material-symbols:phone-enabled-outline-sharp"
            class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            size="20"
          />
        </div>
        <div class="text-sm font-semibold">Contact Information</div>
      </div>
      <div class="flex flex-col items-center gap-4">
        <div
          class="w-9 aspect-square rounded-full flex relative bg-[#232323]"
          :class="{
            'bg-white text-dark': form === 'link',
          }"
        >
          <Icon
            name="material-symbols:link"
            class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            size="20"
          />
        </div>
        <div class="text-sm font-semibold">Social Media & Links</div>
      </div>
    </div>

    <div class="h-40 max-w-284 mx-auto">
      <FormSetupContactInfo
        v-if="form === 'contact'"
        @continued="form = 'link'"
      />
      <FormSetupLinks v-if="form === 'link'" @back="form = 'contact'" />
    </div>
  </section>
</template>
