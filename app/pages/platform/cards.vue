<script setup lang="ts">
definePageMeta({
  layout: 'platform',
});

const { data: cards, pending, error } = await useFetch<CardDTO[]>('/api/cards');
</script>

<template>
  <h1>Cards Page Lay Par Khin Byr</h1>
  <div class="grid grid-cols-3 gap-6">
    <preview-card v-for="card in cards" :key="card.id" :card="card" />
  </div>
</template>
