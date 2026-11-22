<script setup lang="ts">
import type { AdminPillTone } from '~/features/admin/utils/admin-ui';

defineProps<{
  label: string;
  tone: AdminPillTone;
}>();

const TONE_CLASS: Record<AdminPillTone, string> = {
  ink: 'bg-ink/10 text-ink ring-ink/30',
  gold: 'bg-gold/15 text-gold ring-gold/40',
  success: 'bg-green/15 text-green ring-green/40',
  warning:
    'bg-amber-400/15 text-amber-600 ring-amber-400/40 dark:text-amber-300',
  error: 'bg-danger-ink/15 text-danger-ink ring-danger-ink/40',
  info: 'bg-sky-400/15 text-sky-600 ring-sky-400/40 dark:text-sky-300',
  neutral: 'bg-raised text-soft ring-line-strong',
};
</script>

<template>
  <span
    class="inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset"
    :class="TONE_CLASS[tone]"
  >
    {{ label }}
  </span>
</template>
