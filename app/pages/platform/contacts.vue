<script setup lang="ts">
definePageMeta({
  layout: 'platform',
});

import type { TableColumn } from '@nuxt/ui';

type ContactRow = {
  name: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  cardId: string;
};

const { data: contacts } = await useFetch<ContactRow[]>(
  '/api/contact-exchange'
);

const columns: TableColumn<ContactRow>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'phone', header: 'Phone' },
  { accessorKey: 'position', header: 'Position' },
];
</script>

<template>
  <p class="text-sm text-neutral-500">
    People who exchanged contacts from your cards
  </p>
  <UTable :data="contacts" :columns="columns" class="flex-1" />
</template>
