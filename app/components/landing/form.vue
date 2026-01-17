<script setup lang="ts">
const { SECTIONS } = inject(LandingContextKey)!;

const success = ref(false);
const error = ref(false);
const submitting = ref(false);
const toast = useToast();

const onSubmit = async (e: SubmitEvent) => {
  const formData = new FormData(e.target as HTMLFormElement);
  const data = Object.fromEntries(formData.entries());

  submitting.value = true;

  // await new Promise((r) => setTimeout(r, 3000));

  try {
    const response = await $fetch('/api/marketing/landing-form', {
      method: 'POST',
      body: data,
    });

    // toast.add({
    //   title: 'Thank you for your interest.',
    //   description:
    //     'Your submission is saved successfully. We will connect you shortly',
    //   color: 'success',
    //   icon: 'i-heroicons-sparkles',
    //   progress: false,
    //   duration: 5000,
    // });

    (document.querySelector('#landing-form') as HTMLFormElement)?.reset();
    success.value = true;
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
    submitting.value = false;
  }
};
</script>

<template>
  <section class="py-14 sm:py-30" :id="SECTIONS.COMMISSION_US">
    <h2
      class="mx-auto mb-18 max-w-[20rem] text-center text-xl font-light uppercase leading-normal tracking-[0.2rem] sm:max-w-160 sm:text-[2.5rem] sm:tracking-[0.3rem]"
    >
      Your Brand Deserves<br />
      the Best.
    </h2>

    <div
      v-if="success"
      class="mx-auto grid min-h-96 w-full max-w-[39.88rem] gap-8 px-4 sm:px-0"
    >
      <div class="flex flex-col items-center justify-center gap-8">
        <div
          class="text-center text-sm font-light uppercase leading-normal tracking-[0.1rem] sm:text-sm"
        >
          INQUIRY RECEIVED.
        </div>
        <span
          class="max-w-[18rem] text-center text-xs font-light leading-normal tracking-[0.1rem] sm:max-w-76 sm:text-sm"
        >
          Your bespoke digital identity begins now. Our team will reach out
          personally within the day.
        </span>
        <button
          @click="success = false"
          class="group mt-2 w-28 place-self-center rounded-full border border-white/10 py-3 text-xs font-light uppercase leading-none tracking-[0.1rem] transition-all duration-500 hover:bg-white hover:text-dark sm:mt-2 sm:w-28 sm:py-3 sm:text-xs"
        >
          <AnimatedText text="Got it!" />
        </button>
      </div>
    </div>

    <form
      v-else
      @submit.prevent="onSubmit"
      class="mx-auto grid w-full max-w-[39.88rem] gap-6 px-4 sm:px-0"
      id="landing-form"
    >
      <label for="email">
        <span
          class="block text-sm tracking-[0.1rem] text-white mb-3 leading-none"
        >
          Email
        </span>
        <input
          id="email"
          name="email"
          type="email"
          autocomplete="off"
          class="h-[2.8rem] w-full appearance-none border border-white/10 bg-transparent px-4 text-sm font-light tracking-[0.1rem] transition duration-500 hover:border-white/20 focus:border-white/50 focus:outline-none sm:h-[3.13rem] sm:px-6"
        />
        <!-- required
          class="h-[2.8rem] w-full appearance-none border border-white/10 bg-transparent px-4 text-sm font-light tracking-[0.1rem] transition duration-500 hover:border-white/20 focus:border-white/50 focus:outline-none sm:h-[3.13rem] sm:px-6"
        /> -->
      </label>
      <label for="firstname">
        <span
          class="block text-sm tracking-[0.1rem] text-white mb-3 leading-none"
        >
          First Name
        </span>
        <input
          id="firstname"
          name="firstname"
          type="text"
          autocomplete="off"
          class="h-[2.8rem] w-full appearance-none border border-white/10 bg-transparent px-4 text-sm font-light tracking-[0.1rem] transition duration-500 hover:border-white/20 focus:border-white/50 focus:outline-none sm:h-[3.13rem] sm:px-6"
        />
        <!-- required
          class="h-[2.8rem] w-full appearance-none border border-white/10 bg-transparent px-4 text-sm font-light tracking-[0.1rem] transition duration-500 hover:border-white/20 focus:border-white/50 focus:outline-none sm:h-[3.13rem] sm:px-6"
        /> -->
      </label>
      <label for="lastname">
        <span
          class="block text-sm tracking-[0.1rem] text-white mb-3 leading-none"
        >
          Last Name
        </span>
        <input
          id="lastname"
          name="lastname"
          type="text"
          autocomplete="off"
          class="h-[2.8rem] w-full appearance-none border border-white/10 bg-transparent px-4 text-sm font-light tracking-[0.1rem] transition duration-500 hover:border-white/20 focus:border-white/50 focus:outline-none sm:h-[3.13rem] sm:px-6"
        />
      </label>
      <label for="phone">
        <span
          class="block text-sm tracking-[0.1rem] text-white mb-3 leading-none"
        >
          Phone Number
        </span>
        <input
          id="phone"
          name="phone"
          type="phone"
          autocomplete="off"
          class="h-[2.8rem] w-full appearance-none border border-white/10 bg-transparent px-4 text-sm font-light tracking-[0.1rem] transition duration-500 hover:border-white/20 focus:border-white/50 focus:outline-none sm:h-[3.13rem] sm:px-6"
        /> </label
      ><label for="customer_groups">
        <span
          class="block text-sm tracking-[0.1rem] text-white mb-3 leading-none"
        >
          Choose Your Experience Tier
        </span>
        <div class="relative h-[2.8rem] w-full sm:h-[3.13rem]">
          <select
            id="customer_groups"
            name="customer_groups"
            class="h-full w-full appearance-none border border-white/10 bg-transparent px-4 text-sm font-light tracking-[0.1rem] transition duration-500 focus:border-white/50 focus:outline-none sm:px-6"
          >
            <!-- required
            class="h-full w-full appearance-none border border-white/10 bg-transparent px-4 text-sm font-light tracking-[0.1rem] transition duration-500 focus:border-white/50 focus:outline-none sm:px-6"
          > -->
            <option value="Founders' Club (Limited Offer)">
              Founders' Club (Limited Offer)
            </option>
            <option value="Single Card">Single Card</option>
            <option value="Multiple Cards">Multiple Cards</option>
          </select>

          <div
            class="absolute right-2 top-1/2 aspect-square w-6 -translate-y-1/2 sm:right-3"
          >
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <mask
                id="mask0_926_75"
                style="mask-type: alpha"
                maskUnits="userSpaceOnUse"
                x="0"
                y="0"
                width="24"
                height="24"
              >
                <rect width="24" height="24" fill="#D9D9D9" />
              </mask>
              <g mask="url(#mask0_926_75)">
                <path d="M12 15L7 10H17L12 15Z" fill="currentColor" />
              </g>
            </svg>
          </div>
        </div>
      </label>
      <label for="email">
        <span
          class="block text-sm tracking-[0.1rem] text-white mb-3 leading-none"
        >
          Message
        </span>
        <textarea
          id="message"
          name="message"
          autocomplete="off"
          class="min-h-[6.63rem] w-full appearance-none border border-white/10 bg-transparent px-4 py-[0.8rem] text-sm font-light tracking-[0.1rem] transition duration-500 hover:border-white/20 focus:border-white/50 focus:outline-none sm:px-6"
        ></textarea>
      </label>

      <div class="flex cursor-pointer items-start gap-3 sm:gap-6">
        <span
          class="text-xs font-light leading-normal tracking-[0.1rem] sm:text-sm"
        >
          By submitting this form, you'll receive replies, occasional updates,
          exclusive offers, and stories from our world of digital elegance. We
          only share what's meaningful & no spam, ever. Your information stays
          private and secure.
        </span>
      </div>

      <div v-if="error" class="flex cursor-pointer items-start gap-3 sm:gap-6">
        <span
          class="text-xs font-light leading-normal tracking-[0.1rem] text-red-600 sm:text-sm"
        >
          {error}
        </span>
      </div>

      <button
        :disabled="submitting"
        type="submit"
        class="group mt-5 w-60 place-self-center rounded-full border border-white/10 py-4 text-xs font-light uppercase leading-none tracking-[0.1rem] transition-all duration-500 hover:bg-white hover:text-dark sm:mt-10 sm:w-[19.05rem] sm:text-sm"
      >
        <AnimatedText :text="submitting ? 'Submitting...' : 'Submit'" />
      </button>
    </form>
  </section>

  <footer
    class="mt-10 flex flex-row-reverse flex-wrap-reverse items-center justify-center gap-8 px-18 pb-10 sm:mt-0 sm:flex-row sm:justify-between"
  >
    <div
      class="mr-auto w-full text-xs font-light uppercase leading-normal text-white/30 sm:w-auto"
    >
      © la persona. All rights reserved.
    </div>
    <a
      href="https://www.facebook.com/share/15cAByXMcX/"
      target="_blank"
      class="group text-xs font-light uppercase leading-normal"
    >
      <AnimatedText text="Facebook" />
    </a>
    <a
      href="https://www.linkedin.com/company/la-persona-mm/"
      target="_blank"
      class="group text-xs font-light uppercase leading-normal"
    >
      <AnimatedText text="LinkedIn" />
    </a>
  </footer>
</template>
