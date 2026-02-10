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
  <h1
    class="text-[1.75rem] font-medium tracking-[0.17rem] uppercase leading-none"
  >
    Exchanged Contacts
  </h1>
  <UTable :data="contacts" :columns="columns" class="flex-1" />
</template>
