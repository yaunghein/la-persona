<script setup lang="ts">
const route = useRoute();
const step = ref<'contact' | 'link' | 'welcome'>('contact');

function goToDashboard() {
  navigateTo(`/platform/${route.params.orgSlug}/cards`);
}
</script>

<template>
  <section v-if="step !== 'welcome'">
    <div class="mt-9 mx-auto aspect-[1/0.11] w-36 sm:w-44">
      <IconLogo />
    </div>
    <div
      class="relative mx-auto my-10 flex w-full max-w-120 items-start justify-between px-5 sm:my-13"
    >
      <div
        class="absolute left-1/2 top-4.5 h-0.5 w-[calc(100%-5rem)] -translate-x-1/2 bg-[#2A2A2A] sm:w-52"
      ></div>
      <div class="flex flex-col items-center gap-4">
        <div
          class="w-9 aspect-square rounded-full flex relative bg-[#232323]"
          :class="{
            'bg-white text-dark': step === 'contact',
          }"
        >
          <Icon
            name="material-symbols:phone-enabled-outline-sharp"
            class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            size="20"
          />
        </div>
        <div class="max-w-24 text-center text-xs font-semibold sm:max-w-none sm:text-sm">
          Contact Information
        </div>
      </div>
      <div class="flex flex-col items-center gap-4">
        <div
          class="w-9 aspect-square rounded-full flex relative bg-[#232323]"
          :class="{
            'bg-white text-dark': step === 'link',
          }"
        >
          <Icon
            name="material-symbols:link"
            class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            size="20"
          />
        </div>
        <div class="max-w-24 text-center text-xs font-semibold sm:max-w-none sm:text-sm">
          Social Media & Links
        </div>
      </div>
    </div>

    <div class="px-5 pb-5 max-w-284 mx-auto">
      <FormSetupContactInfo
        v-if="step === 'contact'"
        @continued="step = 'link'"
      />
      <FormSetupLinks
        v-if="step === 'link'"
        @back="step = 'contact'"
        @completed="step = 'welcome'"
      />
    </div>
  </section>

  <FormSetupWelcome v-else @enter="goToDashboard" />
</template>
