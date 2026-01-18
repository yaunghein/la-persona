<script setup lang="ts">
import type { ConcreteComponent } from 'vue';

const { cardId } = useRoute().params;
const card = cards.find((card) => card.id === cardId);

const isMenuOpen = ref(false);
const isFormOpen = ref(false);
const isSuccess = ref(false);
const isValid = ref(true);
const isSubmitting = ref(false);
const error = ref('');

const toast = useToast();

const closeForm = () => {
  isFormOpen.value = false;
  setTimeout(() => {
    isSuccess.value = false;
    error.value = '';
  }, 750);
};

const onSubmit = async (e: SubmitEvent) => {
  const formData = new FormData(e.target as HTMLFormElement);
  const data = Object.fromEntries(formData.entries());

  isSubmitting.value = true;

  // await new Promise((r) => setTimeout(r, 3000));
  // console.log({ data });

  try {
    await $fetch('/api/email/send', {
      method: 'POST',
      body: {
        name: data.name,
        to: [data.ownerEmail],
        subject: `New Contact Exchange from ${(data.name as string).split(' ')[0]} 👋`,
        template: 'ContactExchange',
        email: data.email,
        phone: data.phone,
        company: data.company,
      },
    });

    await $fetch('/api/contact-exchange-before-platform', {
      method: 'POST',
      body: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        position: data.company,
        ownerEmail: data.ownerEmail,
      },
    });

    isSuccess.value = true;
  } catch (error: any) {
    toast.add({
      title: 'Error while sending request.',
      description: error.statusMessage || 'Please try again.',
      color: 'error',
      icon: 'i-heroicons-x-circle',
      progress: false,
      duration: 10000,
    });
  } finally {
    isSubmitting.value = false;
  }
};

const iconMap: Record<string, string | ConcreteComponent> = {
  directMessage: resolveComponent('IconDirectMessage'),
  world: resolveComponent('IconWorld'),
  arrowDown: resolveComponent('IconArrowDown'),
};
</script>

<template>
  <div v-if="card" class="relative z-10 h-svh w-screen overflow-hidden">
    <iframe
      title="Spline Scene"
      :src="card.spline"
      class="absolute left-0 top-0 z-0 h-full w-full"
      frameborder="0"
      allow="autoplay"
    ></iframe>

    <div
      class="absolute bottom-8 left-0 right-0 flex w-full gap-3 px-5 transition duration-750 sm:mx-auto sm:max-w-96"
      :class="{
        'translate-y-full': isMenuOpen || isFormOpen,
        'translate-y-0': !isMenuOpen || !isFormOpen,
      }"
    >
      <button
        @click="isFormOpen = !isFormOpen"
        class="grid flex-1 place-items-center rounded-full border border-white/10 bg-white/10 text-sm font-bold"
      >
        Exchange Contact
      </button>
      <button
        @click="isMenuOpen = !isMenuOpen"
        class="grid aspect-square w-13 shrink-0 place-items-center rounded-full border border-white/10 bg-white/10"
      >
        <div class="aspect-square w-6">
          <IconMenu />
        </div>
      </button>
    </div>

    <div
      class="fixed inset-0 top-auto -mb-px h-[calc(100dvh-3.5rem)] w-full scale-[1.005] rounded-t-xl border border-white/10 bg-dark transition duration-750 sm:mx-auto sm:max-w-104"
      :class="{
        'translate-y-0': isFormOpen,
        'translate-y-full': !isFormOpen,
      }"
    >
      <div class="flex h-full flex-col">
        <div
          class="flex items-center justify-center border-b border-white/10 py-6 text-center text-sm font-bold transition duration-750"
          :class="{
            'opacity-100': isFormOpen,
            'opacity-0': !isFormOpen,
          }"
        >
          Exchange Contact
        </div>

        <div
          v-if="isSuccess"
          class="flex flex-1 flex-col items-center justify-center gap-6"
        >
          <div class="text-sm font-bold leading-none tracking-[0.1rem]">
            You're all set!
          </div>
          <p
            class="mx-auto max-w-[16rem] text-center text-xs font-light leading-normal tracking-[0.1rem]"
          >
            Tap below to save {{ card.name }}'s contact directly to your phone.
          </p>
        </div>

        <div v-else class="hide-scrollbar flex-1 overflow-y-scroll">
          <div
            class="mx-auto max-w-52 pt-8 text-center text-sm font-light leading-normal sm:max-w-[18rem]"
          >
            Share your information to receive this contact and stay connected.
          </div>
          <form
            id="form"
            autocomplete="off"
            class="flex flex-col gap-7 px-5 py-9"
            @submit.prevent="onSubmit"
          >
            <label
              class="flex flex-col gap-3 text-xs font-light tracking-[0.1rem]"
            >
              Your Name
              <input
                name="name"
                type="text"
                autocomplete="off"
                required
                class="h-[2.8rem] w-full appearance-none border border-white/10 bg-transparent px-4 text-sm font-light tracking-[0.1rem] transition duration-500 placeholder:text-xs placeholder:tracking-[0.1rem] placeholder:text-white/20 hover:border-white/20 focus:border-white/50 focus:outline-none sm:h-[3.13rem] sm:px-6"
              />
            </label>
            <PhoneInput />
            <label
              class="flex flex-col gap-3 text-xs font-light tracking-[0.1rem]"
            >
              Email Address (Optional)
              <input
                name="email"
                type="email"
                autocomplete="off"
                class="h-[2.8rem] w-full appearance-none border border-white/10 bg-transparent px-4 text-sm font-light tracking-[0.1rem] transition duration-500 placeholder:text-xs placeholder:tracking-[0.1rem] placeholder:text-white/20 hover:border-white/20 focus:border-white/50 focus:outline-none sm:h-[3.13rem] sm:px-6"
              />
            </label>

            <label
              class="flex flex-col gap-3 text-xs font-light tracking-[0.1rem]"
            >
              Company / Role (Optional)
              <input
                name="company"
                type="text"
                autocomplete="off"
                placeholder="eg. Designer at La Persona"
                class="h-[2.8rem] w-full appearance-none border border-white/10 bg-transparent px-4 text-sm font-light tracking-[0.1rem] transition duration-500 placeholder:text-xs placeholder:tracking-[0.1rem] placeholder:text-white/20 hover:border-white/20 focus:border-white/50 focus:outline-none sm:h-[3.13rem] sm:px-6"
              />
            </label>
            <input type="hidden" name="ownerEmail" :value="card.email" />
          </form>
        </div>
        <div
          class="flex flex-col items-center justify-center gap-6 border-t border-white/10 px-5 py-8"
        >
          <a
            v-if="isSuccess"
            :href="card.vcf"
            :download="`${card.id}.vcf`"
            class="w-full rounded-full border border-white/10 bg-white py-4 text-center text-xs font-bold leading-none tracking-[0.1rem] text-dark transition-all duration-500 disabled:bg-white/10 disabled:text-white/20"
          >
            Save Contact
          </a>
          <button
            v-else
            type="submit"
            form="form"
            :disabled="!isValid || isSubmitting"
            class="relative w-full rounded-full border border-white/10 bg-white py-4 text-xs font-bold leading-none tracking-[0.1rem] text-dark transition-all duration-500 disabled:bg-white/10 disabled:text-white/20"
          >
            Exchange Contact
            <div
              v-if="isSubmitting"
              class="absolute right-[0.26rem] top-[51.75%] -translate-y-1/2"
            >
              <div
                class="inline-block size-9 animate-spin rounded-full border border-current border-t-transparent text-white/20"
                role="status"
                aria-label="loading"
              >
                <span class="sr-only">Loading...</span>
              </div>
            </div>
          </button>

          <div
            v-if="error"
            class="flex cursor-pointer items-start gap-3 sm:gap-6"
          >
            <span
              class="text-center text-xs font-light leading-normal tracking-[0.1rem] text-red-600 sm:text-sm"
            >
              {{ error }}
            </span>
          </div>

          <button
            @click="closeForm"
            class="text-xs font-bold leading-none tracking-[0.1rem] underline underline-offset-4"
          >
            Exit
          </button>
        </div>
      </div>
    </div>

    <div
      class="fixed inset-0 top-auto -mb-px w-full scale-[1.005] rounded-t-xl border border-white/10 bg-dark py-6 transition duration-750 sm:mx-auto sm:max-w-104"
      :class="{
        'translate-y-0': isMenuOpen,
        'translate-y-100': !isMenuOpen,
      }"
    >
      <div>
        <button
          @click="isMenuOpen = false"
          class="absolute right-4 top-4 grid aspect-square w-8 place-items-center rounded-full border border-white/10 bg-white/10 transition duration-750"
          :class="{ 'opacity-100': isMenuOpen, 'opacity-0': !isMenuOpen }"
        >
          <div class="aspect-square w-[0.62rem]">
            <IconClose />
          </div>
        </button>
        <div
          class="text-center text-sm font-bold transition duration-750"
          :class="{
            'opacity-100': isMenuOpen,
            'opacity-0': !isMenuOpen,
          }"
        >
          Explore
        </div>
        <div
          class="hide-scrollbar mt-8 flex justify-start gap-3 overflow-x-scroll px-5"
        >
          <template v-for="(link, index) in card.links" :key="index">
            <a
              v-if="link.icon.includes('.')"
              :href="link.href"
              target="_blank"
              class="flex shrink-0 flex-col items-center gap-4 transition duration-750"
              :class="isMenuOpen ? 'opacity-100' : 'opacity-0'"
              :style="{ transitionDelay: `${(index + 1) * 100}ms` }"
            >
              <div
                class="grid aspect-square w-[4.56rem] overflow-hidden rounded-full bg-white/10"
              >
                <img
                  :src="link.icon"
                  :alt="link.label"
                  class="aspect-square h-full w-full object-cover"
                />
              </div>
              <div class="max-w-16 text-center text-xs leading-[1.1]">
                {{ link.label }}
              </div>
            </a>

            <a
              v-else
              :href="link.href"
              target="_blank"
              class="flex shrink-0 flex-col items-center gap-4 transition duration- 750"
              :class="isMenuOpen ? 'opacity-100' : 'opacity-0'"
              :style="{ transitionDelay: `${(index + 1) * 100}ms` }"
            >
              <div
                class="grid aspect-square w-[4.56rem] place-items-center rounded-full bg-white/10"
              >
                <div class="aspect-square w-8">
                  <component :is="iconMap[link.icon]" />
                </div>
              </div>
              <div class="max-w-16 text-center text-xs leading-[1.1]">
                {{ link.label }}
              </div>
            </a>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
