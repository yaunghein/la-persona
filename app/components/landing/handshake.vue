<script setup lang="ts">
const navItems = [
  { label: 'The Masterpieces', id: SECTIONS.MASTERPIECES },
  { label: 'How It Works', id: SECTIONS.HOW_IT_WORKS },
  { label: 'Why Us?', id: SECTIONS.WHY_US },
  { label: 'commision us', id: SECTIONS.COMMISSION_US },
];

const goToSection = (item: (typeof navItems)[number]) => {
  document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
};
</script>

<template>
  <section>
    <div
      class="relative flex h-svh w-full flex-col items-center justify-center gap-14"
    >
      <div class="absolute inset-0 h-full w-full overflow-hidden">
        <!-- <video id="video" loop muted playsinline class="h-full w-full object-cover">
				<source src="/videos/handshake.mp4" type="video/mp4" />
			</video> -->
        <img
          src="/images/handshake.gif"
          alt=""
          class="h-full w-full object-cover"
        />
      </div>
      <div class="absolute inset-0 h-full w-full bg-dark/30"></div>
      <h2
        class="relative mx-auto -mb-5 max-w-[20rem] text-center text-xl font-light uppercase leading-normal tracking-[0.2rem] sm:max-w-160 sm:text-[2.5rem] sm:tracking-[0.3rem]"
      >
        Stand Out.<br />Be Remembered.
      </h2>
      <p
        class="relative mx-auto max-w-56 text-center text-sm font-light leading-normal sm:max-w-[20rem]"
      >
        Your next-level business card is a few steps away. Tell us who you are.
        We'll take care of the rest.
      </p>
      <button
        @click="goToSection(navItems[3]!)"
        class="group relative w-60 rounded-full border border-white/10 py-4 text-xs font-light uppercase leading-none tracking-[0.1rem] transition-all duration-500 hover:bg-white hover:text-dark sm:w-[19.05rem] sm:text-sm"
      >
        <AnimatedText text="join founders club" />
      </button>
    </div>
  </section>
</template>
