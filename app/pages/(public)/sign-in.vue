<script setup lang="ts">
useSeoMeta({ ...getSeoTitle('Sign In - LA PERSONA') });

import { Application } from '@splinetool/runtime';

const toast = useToast();
const loading = ref(false);
const email = ref('');
const isSigningIn = ref(false);

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
  isSigningIn.value = true;
  try {
    await signIn();
  } catch {
    toast.add({
      title: 'Sign-in failed',
      description: 'Could not continue with social login. Please try again.',
      color: 'error',
    });
  } finally {
    isSigningIn.value = false;
  }
};

const onLinkedIn = () => {
  toast.add({
    title: 'Coming soon',
    description: 'LinkedIn sign-in is not available yet.',
    color: 'neutral',
  });
};

const onMagicLink = () => {
  toast.add({
    title: 'Coming soon',
    description: `Magic link is not configured yet for ${email.value || 'this email'}.`,
    color: 'neutral',
  });
};
</script>

<template>
  <div class="min-h-screen bg-dark">
    <div class="mx-auto flex min-h-screen">
      <div class="w-1/2 bg-dark relative overflow-hidden">
        <canvas
          id="login-spline"
          class="h-full w-full absolute inset-0"
        ></canvas>
      </div>

      <div
        class="relative w-1/2 flex items-center justify-center bg-[#171717] px-6 py-16"
      >
        <div class="w-full max-w-[485px] space-y-8">
          <div class="mx-auto max-w-[254px] space-y-8 text-center">
            <h1
              class="text-[28px] font-medium leading-none tracking-widest text-white uppercase"
            >
              Sign In
            </h1>
            <p class="text-sm leading-[21px] text-[#8b8b8b]">
              Access your cards, manage your contacts, and update your presence.
            </p>
          </div>

          <div class="space-y-4">
            <UButton
              block
              size="md"
              color="neutral"
              :loading="isSigningIn"
              class="h-9 justify-center rounded-full bg-white font-medium text-dark hover:bg-white/90 active:hover:bg-white/80"
              @click="onGoogle"
            >
              <template #leading>
                <UIcon name="i-simple-icons-google" class="size-4" />
              </template>
              Continue with Google
            </UButton>

            <UButton
              block
              size="md"
              color="neutral"
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
              size="md"
              color="neutral"
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
          class="absolute bottom-6 left-1/2 w-full max-w-[485px] -translate-x-1/2 px-6 text-center text-sm leading-[21px] text-[#8b8b8b]"
        >
          By continuing, you agree to La Persona's
          <a href="#" class="underline underline-offset-2">
            Terms and Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  </div>
</template>
