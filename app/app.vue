<script setup lang="ts">
const colorMode = useColorMode();
const inAppBrowser = useInAppBrowser();

useHead({
  meta: [
    {
      name: 'theme-color',
      content: () => (colorMode.value === 'light' ? '#ededf0' : '#121212'),
    },
  ],
});
</script>

<template>
  <UApp :toaster="{ position: 'bottom-center', duration: 5000 }">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <UiInAppBrowserPrompt
      v-if="inAppBrowser.isPromptVisible.value"
      :preview="inAppBrowser.preview.value"
      :can-open-externally="inAppBrowser.canOpenExternally.value"
      @open="inAppBrowser.openInBrowser"
      @dismiss="inAppBrowser.dismiss"
    />
  </UApp>
</template>
