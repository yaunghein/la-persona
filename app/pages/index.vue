<script setup lang="ts">
const SECTIONS = {
  MASTERPIECES: 'masterpieces',
  HOW_IT_WORKS: 'how-it-works',
  WHY_US: 'why-us',
  COMMISSION_US: 'commission-us',
};

const landingContext: LandingContext = { SECTIONS };
provide(LandingContextKey, landingContext);
</script>

<template>
  <LandingNavbar />
</template>
