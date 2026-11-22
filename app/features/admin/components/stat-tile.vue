<script setup lang="ts">
defineProps<{
  icon: string;
  label: string;
  value: string | number;
  delta?: string;
  deltaTone?: 'good' | 'bad';
  to?: string;
  attention?: boolean;
}>();

const NuxtLink = resolveComponent('NuxtLink');
</script>

<template>
  <component
    :is="to ? NuxtLink : 'div'"
    :to="to"
    class="block rounded-lg bg-surface p-4 sm:p-6"
    :class="[
      to &&
        'group transition-colors hover:bg-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-strong',
      attention && 'ring-1 ring-inset ring-gold/40 hover:ring-gold/70',
    ]"
  >
    <div class="mb-4 flex items-start justify-between gap-3">
      <div
        class="grid size-8 place-items-center rounded-[4px] transition-colors sm:size-11"
        :class="
          attention ? 'bg-gold/15' : ['bg-raised', to && 'group-hover:bg-line']
        "
      >
        <UIcon
          :name="icon"
          class="size-5"
          :class="attention ? 'text-gold' : 'text-ink/70'"
        />
      </div>
      <UIcon
        v-if="to"
        name="i-lucide-arrow-up-right"
        class="size-5 text-subtle transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink motion-reduce:transform-none"
      />
    </div>
    <p
      class="-mt-1 mb-4 truncate text-xs font-medium uppercase tracking-[1.2px] text-subtle"
    >
      {{ label }}
    </p>
    <div class="-mb-1 mt-1 flex flex-wrap items-center gap-x-3 gap-y-2">
      <p class="text-3xl font-bold leading-[1.1] tabular-nums text-ink">
        {{ value }}
      </p>
      <AdminStatusPill
        v-if="delta"
        :label="delta"
        :tone="
          deltaTone === 'good'
            ? 'success'
            : deltaTone === 'bad'
              ? 'error'
              : 'neutral'
        "
      />
    </div>
  </component>
</template>
