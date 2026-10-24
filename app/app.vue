<script setup lang="ts">
const colorMode = useColorMode();

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
  </UApp>
</template>
