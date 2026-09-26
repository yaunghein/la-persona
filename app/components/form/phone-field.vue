<script setup lang="ts">
import { countries } from 'country-codes-flags-phone-codes';
import {
  DEFAULT_PHONE_COUNTRY_CODE,
  dialCodeForCountry,
  normalizePhoneCountryCode,
} from '~~/shared/utils/phone';

const phone = defineModel<string>({ default: '' });
const countryCode = defineModel<string>('countryCode', {
  default: DEFAULT_PHONE_COUNTRY_CODE,
});

const props = defineProps<{
  name?: string;
  placeholder?: string;
  variant?: 'outline' | 'soft' | 'subtle' | 'ghost' | 'none';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  ui?: {
    base?: string;
    leading?: string;
  };
}>();

const open = ref(false);
const search = ref('');

const shellClass = computed(() => {
  if (props.ui?.base) return props.ui.base;

  const heights = {
    xs: 'h-8 text-xs',
    sm: 'h-9 text-xs',
    md: 'h-10 text-sm',
    lg: 'h-11 text-sm',
    xl: 'h-12 text-base',
  } as const;
  const variants = {
    outline: 'bg-default ring ring-inset ring-accented',
    soft: 'bg-elevated/50',
    subtle: 'bg-elevated ring ring-inset ring-accented',
    ghost: 'bg-transparent',
    none: 'bg-transparent',
  } as const;

  return [
    'rounded-md text-highlighted',
    heights[props.size || 'md'],
    variants[props.variant || 'outline'],
  ];
});

watch(
  countryCode,
  (value) => {
    const normalized = normalizePhoneCountryCode(value);
    if (value !== normalized) countryCode.value = normalized;
  },
  { immediate: true }
);

const dialCode = computed(() => dialCodeForCountry(countryCode.value));

const filteredCountries = computed(() => {
  const query = search.value.trim().toLowerCase();
  if (!query) return countries;
  return countries.filter(
    (country) =>
      country.name.toLowerCase().includes(query) ||
      country.code.toLowerCase().includes(query) ||
      country.dialCode.includes(query)
  );
});

function selectCountry(code: string) {
  countryCode.value = code;
  open.value = false;
  search.value = '';
}
</script>

<template>
  <div
    class="flex w-full items-center"
    :class="[shellClass, props.ui?.base ? 'border' : '']"
  >
    <UPopover v-model:open="open" :content="{ align: 'start', side: 'bottom' }">
      <button
        type="button"
        class="flex shrink-0 items-center gap-4 pl-4"
        :aria-label="`Country code ${dialCode}`"
      >
        <span>{{ dialCode }}</span>
        <span class="h-5 w-px shrink-0 bg-white/10" />
      </button>
      <template #content>
          <div class="w-72 p-2">
            <UInput
              v-model="search"
              placeholder="Search countries"
              size="sm"
              variant="none"
              leading-icon="i-lucide-search"
              class="mb-2 w-full"
              :ui="{
                root: 'w-full',
                base: 'ring-0 focus:ring-0 focus-visible:ring-0',
              }"
            />
            <div class="max-h-48 overflow-y-auto">
              <button
                v-for="country in filteredCountries"
                :key="country.code"
                type="button"
                class="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-elevated"
                @click="selectCountry(country.code)"
              >
                <span>{{ country.flag }}</span>
                <span class="min-w-0 flex-1 truncate">{{ country.name }}</span>
                <span class="text-muted">{{ country.dialCode }}</span>
              </button>
              <p
                v-if="!filteredCountries.length"
                class="px-2 py-2 text-sm text-muted"
              >
                No country found.
              </p>
            </div>
          </div>
      </template>
    </UPopover>
    <input
      :id="name"
      :name="name"
      v-model="phone"
      type="tel"
      autocomplete="tel"
      :placeholder="placeholder"
      class="min-w-0 flex-1 bg-transparent pl-4 outline-none placeholder:text-white/50"
    />
  </div>
</template>
