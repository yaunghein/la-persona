<script setup lang="ts">
definePageMeta({
  colorMode: 'dark',
});

usePageSeo({
  title: 'Sign In - LA PERSONA',
  description:
    'Sign in to LA PERSONA to manage your digital business card, contacts, and community events.',
});

import { Application } from '@splinetool/runtime';
import { z } from 'zod';
import { getSafeInternalPath } from '~~/shared/utils/safe-redirect';

const toast = useToast();
const route = useRoute();
const loading = ref(false);
const email = ref('');

const { data: inviteeEmail } = useInviteeEmailQuery(
  () => getSafeInternalPath(route.query.redirectTo) || ''
);
watch(
  inviteeEmail,
  (value) => {
    if (value && !email.value) email.value = value;
  },
  { immediate: true }
);
const isGoogleSigningIn = ref(false);
const isLinkedInSigningIn = ref(false);
const isMagicLinkSending = ref(false);

watch(
  () => route.query.error,
  (authError) => {
    if (authError === 'EXPIRED_TOKEN') {
      toast.add({
        title: 'Magic link expired',
        description: 'Please request a new sign-in link to continue.',
        color: 'warning',
      });
      return;
    }

    if (typeof authError === 'string' && authError) {
      toast.add({
        title: 'Sign-in failed',
        description: 'Please try signing in again.',
        color: 'error',
      });
    }
  },
  { immediate: true }
);

onMounted(async () => {
  loading.value = true;
  const canvas = document.querySelector('#login-spline') as HTMLCanvasElement;
  const spline = new Application(canvas);
  spline.load(
    'https://prod.spline.design/szr0-6Srx9EJxnil/scene.splinecode' +
      `?v=${new Date().getTime()}`
  );
});

const onGoogle = async () => {
  isGoogleSigningIn.value = true;
  try {
    await signInWithGoogle();
  } catch (error: any) {
    toast.add({
      title: 'Sign-in failed',
      description:
        error?.message ||
        'Could not continue with Google login. Please try again.',
      color: 'error',
    });
  } finally {
    isGoogleSigningIn.value = false;
  }
};

const onLinkedIn = async () => {
  isLinkedInSigningIn.value = true;
  try {
    await signInWithLinkedIn();
  } catch (error: any) {
    toast.add({
      title: 'Sign-in failed',
      description:
        error?.message ||
        'Could not continue with LinkedIn login. Please try again.',
      color: 'error',
    });
  } finally {
    isLinkedInSigningIn.value = false;
  }
};

const magicLinkStatus = ref<{
  color: 'success' | 'error';
  title: string;
  description: string;
} | null>(null);

watch(email, () => {
  magicLinkStatus.value = null;
});

function showMagicLinkError(description: string) {
  magicLinkStatus.value = {
    color: 'error',
    title: "Couldn't send the link",
    description,
  };
}

const onMagicLink = async () => {
  const normalizedEmail = email.value.trim().toLowerCase();
  if (!normalizedEmail) {
    magicLinkStatus.value = {
      color: 'error',
      title: 'Email required',
      description: 'Enter your email and we will send you a sign-in\u00a0link.',
    };
    return;
  }
  if (!z.email().safeParse(normalizedEmail).success) {
    magicLinkStatus.value = {
      color: 'error',
      title: 'Invalid email',
      description: 'Enter a valid email address, like\u00a0name@example.com.',
    };
    return;
  }

  isMagicLinkSending.value = true;
  magicLinkStatus.value = null;
  try {
    const { error } = await signInWithMagicLink(normalizedEmail);
    if (error) {
      showMagicLinkError(
        error.message || 'Check your email address and try\u00a0again.'
      );
      return;
    }

    magicLinkStatus.value = {
      color: 'success',
      title: 'Check your inbox',
      description: `We sent a sign-in link to ${normalizedEmail}. It expires in 30\u00a0minutes.`,
    };
  } catch (error: any) {
    showMagicLinkError(
      error?.message || 'Check your email address and try\u00a0again.'
    );
  } finally {
    isMagicLinkSending.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen bg-canvas">
    <div class="mx-auto flex min-h-screen flex-col sm:flex-row p-4 sm:p-0">
      <div
        class="w-full sm:w-1/2 bg-canvas relative overflow-hidden min-h-[28dvh] flex-1 sm:flex-none sm:min-h-full"
      >
        <canvas
          id="login-spline"
          class="h-full w-full absolute inset-0 scale-120 sm:scale-100"
        ></canvas>
      </div>

      <div
        class="relative w-full sm:w-1/2 flex items-center justify-center bg-surface px-6 py-10 sm:py-16 min-h-[58dvh] sm:min-h-full rounded-lg sm:rounded-none"
      >
        <div class="w-full max-w-121.25 space-y-8 mb-12">
          <div class="mx-auto max-w-63.5 space-y-6 text-center">
            <h1
              class="text-[1.75rem] font-medium leading-none tracking-widest text-ink uppercase"
            >
              Sign In
            </h1>
            <p class="text-sm leading-5.25 text-muted">
              Access your cards, manage your contacts, and update your presence.
            </p>
          </div>

          <div class="space-y-4">
            <UButton
              block
              color="neutral"
              :loading="isGoogleSigningIn"
              class="h-10 text-sm justify-center rounded-full bg-ink font-medium text-ink-inverse hover:bg-ink/90 active:hover:bg-ink/80"
              @click="onGoogle"
            >
              <template #leading>
                <UIcon name="i-simple-icons-google" class="size-[0.9rem]" />
              </template>
              Continue with Google
            </UButton>

            <UButton
              block
              color="neutral"
              :loading="isLinkedInSigningIn"
              class="h-10 text-sm justify-center rounded-full bg-ink font-medium text-ink-inverse hover:bg-ink/90 active:hover:bg-ink/80"
              @click="onLinkedIn"
            >
              <template #leading>
                <UIcon name="i-simple-icons-linkedin" class="size-4" />
              </template>
              Continue with LinkedIn
            </UButton>
          </div>

          <div class="flex items-center gap-2">
            <div class="h-px flex-1 bg-line" />
            <span class="px-2 text-sm leading-5.25 text-subtle">or</span>
            <div class="h-px flex-1 bg-line" />
          </div>

          <form class="space-y-4" novalidate @submit.prevent="onMagicLink">
            <UFormField
              label="Email"
              name="email"
              class="[&_label]:mb-3 [&_label]:text-sm [&_label]:font-medium [&_label]:text-ink"
            >
              <UInput
                v-model="email"
                type="email"
                placeholder="johndoe@gmail.com"
                size="xl"
                class="w-full"
                :ui="{
                  base: 'h-11.75 rounded-[4px] border-line bg-raised text-sm text-ink placeholder:text-ink/50',
                }"
              />
            </UFormField>

            <div class="relative">
              <UButton
                block
                color="neutral"
                type="submit"
                :loading="isMagicLinkSending"
                class="h-10 text-sm justify-center rounded-full bg-ink font-medium text-ink-inverse hover:bg-ink/90 active:hover:bg-ink/80"
              >
                <template #leading>
                  <UIcon name="i-lucide-sparkles" class="size-4" />
                </template>
                Send Magic Link
              </UButton>

              <div
                v-if="magicLinkStatus"
                role="status"
                aria-live="polite"
                class="absolute inset-x-0 top-full mt-4 flex items-start gap-3 rounded-sm border px-4 py-3"
                :class="
                  magicLinkStatus.color === 'success'
                    ? 'border-success-ink/20 bg-success-ink/3'
                    : 'border-error/20 bg-error/5'
                "
              >
                <UIcon
                  v-if="magicLinkStatus.color === 'success'"
                  name="i-lucide-mail-check"
                  class="mt-0.5 size-4 shrink-0 text-ink"
                />
                <UIcon
                  v-else
                  name="i-lucide-triangle-alert"
                  class="mt-0.5 size-4 shrink-0 text-ink"
                />
                <div class="flex flex-col gap-1">
                  <p class="text-sm font-medium leading-5 text-ink">
                    {{ magicLinkStatus.title }}
                  </p>
                  <p class="text-sm leading-5 text-subtle">
                    {{ magicLinkStatus.description }}
                  </p>
                </div>
              </div>
            </div>
          </form>
        </div>

        <p
          class="absolute bottom-6 left-1/2 w-full text-xs max-w-121.25 -translate-x-1/2 px-6 text-center sm:text-sm leading-5.25 text-subtle"
        >
          By continuing, you agree to La Persona's
          <NuxtLink href="/privacy-policy" class="underline underline-offset-2">
            Terms and Privacy Policy
          </NuxtLink>
          .
        </p>
      </div>
    </div>
  </div>
</template>
