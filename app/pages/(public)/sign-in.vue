<script setup lang="ts">
useSeoMeta({ ...getSeoTitle('Sign In - LA PERSONA') });

import { Application } from '@splinetool/runtime';

const toast = useToast();
const route = useRoute();
const loading = ref(false);
const email = ref('');
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

const onMagicLink = async () => {
  const normalizedEmail = email.value.trim().toLowerCase();
  if (!normalizedEmail) {
    toast.add({
      title: 'Email required',
      description: 'Please enter your email to receive a magic link.',
      color: 'warning',
    });
    return;
  }

  isMagicLinkSending.value = true;
  try {
    const { error } = await signInWithMagicLink(normalizedEmail);
    if (error) {
      toast.add({
        title: 'Magic link failed',
        description:
          error.message || 'Could not send magic link. Please try again.',
        color: 'error',
      });
      return;
    }

    toast.add({
      title: 'Magic link sent',
      description: `We sent a sign-in link to ${normalizedEmail}.`,
      color: 'success',
    });
  } catch (error: any) {
    toast.add({
      title: 'Magic link failed',
      description:
        error?.message || 'Could not send magic link. Please try again.',
      color: 'error',
    });
  } finally {
    isMagicLinkSending.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen bg-dark">
    <div class="mx-auto flex min-h-screen flex-col sm:flex-row p-4 sm:p-0">
      <div
        class="w-full sm:w-1/2 bg-dark relative overflow-hidden min-h-[28dvh] flex-1 sm:flex-none sm:min-h-full"
      >
        <canvas
          id="login-spline"
          class="h-full w-full absolute inset-0 scale-120 sm:scale-100"
        ></canvas>
      </div>

      <div
        class="relative w-full sm:w-1/2 flex items-center justify-center bg-[#171717] px-6 py-10 sm:py-16 min-h-[58dvh] sm:min-h-full rounded-lg sm:rounded-none"
      >
        <div class="w-full max-w-[485px] space-y-8 mb-12">
          <div class="mx-auto max-w-[254px] space-y-6 text-center">
            <h1
              class="text-[1.75rem] font-medium leading-none tracking-widest text-white uppercase"
            >
              Sign In
            </h1>
            <p class="text-sm leading-[21px] text-muted">
              Access your cards, manage your contacts, and update your presence.
            </p>
          </div>

          <div class="space-y-4">
            <UButton
              block
              size="xl"
              color="neutral"
              :loading="isGoogleSigningIn"
              class="h-9 justify-center rounded-full bg-white font-medium text-dark hover:bg-white/90 active:hover:bg-white/80"
              @click="onGoogle"
            >
              <template #leading>
                <UIcon name="i-simple-icons-google" class="size-[0.9rem]" />
              </template>
              Continue with Google
            </UButton>

            <UButton
              block
              size="xl"
              color="neutral"
              :loading="isLinkedInSigningIn"
              class="h-9 justify-center rounded-full bg-white font-medium text-dark hover:bg-white/90 active:hover:bg-white/80"
              @click="onLinkedIn"
            >
              <template #leading>
                <UIcon name="i-simple-icons-linkedin" class="size-4" />
              </template>
              Continue with LinkedIn
            </UButton>
          </div>

          <div class="flex items-center gap-2">
            <div class="h-px flex-1 bg-[#2a2a2a]" />
            <span class="px-2 text-sm leading-[21px] text-[#8b8b8b]">or</span>
            <div class="h-px flex-1 bg-[#2a2a2a]" />
          </div>

          <div class="space-y-4">
            <UFormField
              label="Email"
              name="email"
              class="[&_label]:mb-3 [&_label]:text-sm [&_label]:font-medium [&_label]:text-white"
            >
              <UInput
                v-model="email"
                type="email"
                placeholder="johndoe@gmail.com"
                size="xl"
                class="w-full"
                :ui="{
                  base: 'h-[47px] rounded-[4px] border-[#2a2a2a] bg-[#232323] text-sm text-white placeholder:text-white/50',
                }"
              />
            </UFormField>

            <UButton
              block
              size="xl"
              color="neutral"
              :loading="isMagicLinkSending"
              class="h-9 justify-center rounded-full bg-white font-medium text-dark hover:bg-white/90 active:hover:bg-white/80"
              @click="onMagicLink"
            >
              <template #leading>
                <UIcon name="i-lucide-sparkles" class="size-4" />
              </template>
              Send Magic Link
            </UButton>
          </div>
        </div>

        <p
          class="absolute bottom-6 left-1/2 w-full text-xs max-w-[485px] -translate-x-1/2 px-6 text-center sm:text-sm leading-[21px] text-[#8b8b8b]"
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
