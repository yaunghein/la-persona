<script setup lang="ts">
const props = defineProps<{
  pending?: boolean;
  errorTitle?: string;
  errorMessage?: string;
  coverSrc?: string;
  coverAspectClass?: string;
  logoSrc?: string;
  organizationName?: string;
  meta?: string[];
  notice?: string;
  noticeColor?: 'warning' | 'error' | 'neutral' | 'success';
  actionLabel?: string;
  actionLoading?: boolean;
  actionDisabled?: boolean;
}>();

const emit = defineEmits<{
  action: [];
  retry: [];
}>();
</script>

<template>
  <div
    class="flex min-h-dvh items-center justify-center bg-[#171717] px-6 py-10"
  >
    <div class="flex w-full max-w-120 flex-col gap-8">
      <div v-if="pending" class="flex flex-col items-center gap-3 py-16">
        <UIcon
          name="i-lucide-loader-2"
          class="size-8 animate-spin text-primary"
        />
        <p class="text-sm text-[#8b8b8b]">Loading invitation...</p>
      </div>

      <div v-else-if="errorTitle" class="space-y-4 py-16 text-center">
        <h1 class="text-xl font-medium uppercase tracking-widest text-white">
          {{ errorTitle }}
        </h1>
        <p v-if="errorMessage" class="text-sm text-[#8b8b8b]">
          {{ errorMessage }}
        </p>
        <UButton
          label="Try again"
          color="neutral"
          class="rounded-full bg-white px-5 font-medium text-dark"
          @click="emit('retry')"
        />
      </div>

      <div v-else class="flex flex-col gap-10 pb-10 rounded-lg bg-[#232323]">
        <div
          class="w-full overflow-hidden rounded-t-lg bg-[#232323]"
          :class="props.coverAspectClass || 'aspect-[1/0.25]'"
        >
          <img
            v-if="coverSrc"
            :src="coverSrc"
            alt=""
            class="size-full object-cover"
          />
        </div>

        <div class="flex flex-col items-center gap-6 px-6">
          <p class="text-base font-medium leading-5 text-white">
            You’ve been invited to join
          </p>
          <div class="flex w-full flex-col items-center gap-4">
            <div
              v-if="logoSrc"
              class="flex size-18 items-center justify-center overflow-hidden rounded-full bg-white"
            >
              <img
                :src="logoSrc"
                :alt="organizationName || ''"
                class="size-full object-cover"
              />
            </div>
            <div class="flex flex-col items-center gap-2 text-center">
              <h1
                class="text-xl font-normal uppercase leading-5 tracking-widest text-white"
              >
                {{ organizationName }}
              </h1>
              <p
                v-if="meta?.length"
                class="flex flex-wrap items-center justify-center gap-2 text-sm font-medium leading-5 text-[#8b8b8b]"
              >
                <template v-for="(item, index) in meta" :key="item">
                  <span
                    v-if="index > 0"
                    class="size-0.75 shrink-0 rounded-full bg-[#8b8b8b]"
                    aria-hidden="true"
                  />
                  <span>{{ item }}</span>
                </template>
              </p>
            </div>
          </div>
        </div>

        <div class="flex flex-col items-center gap-6 px-6">
          <UAlert
            v-if="notice"
            :color="'warning'"
            variant="soft"
            :title="notice"
            class="w-full text-center"
          />
          <UButton
            v-if="actionLabel"
            :label="actionLabel"
            color="neutral"
            :loading="actionLoading"
            :disabled="actionDisabled || actionLoading"
            class="h-auto w-full max-w-87.5 justify-center rounded-full bg-white px-2.5 py-5 font-bold text-sm text-dark hover:bg-white"
            @click="emit('action')"
          />
        </div>
      </div>

      <p
        class="w-full mx-auto max-w-80 text-center text-sm leading-normal text-[#8b8b8b]"
      >
        By creating a La Persona account, you agree to our
        <NuxtLink
          href="/privacy-policy"
          class="text-white underline underline-offset-2"
        >
          E-sign Consent
        </NuxtLink>
        and
        <NuxtLink
          href="/privacy-policy"
          class="text-white underline underline-offset-2"
        >
          User Agreement
        </NuxtLink>
        .
      </p>
    </div>
  </div>
</template>
