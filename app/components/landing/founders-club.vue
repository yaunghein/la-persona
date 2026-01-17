<script setup lang="ts">
import { Application } from '@splinetool/runtime';

onMounted(async () => {
  let spline: Application;
  const canvas = document.querySelector(
    '#founders-club-invite'
  ) as HTMLCanvasElement;
  spline = new Application(canvas);
  spline.load('https://prod.spline.design/jbLz0UL46t58GTzK/scene.splinecode');

  const targetElement = document.querySelector('#founders-club') as HTMLElement;
  const observerCallback = (
    entries: IntersectionObserverEntry[],
    observer: IntersectionObserver
  ) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && spline) {
        const object = spline.findObjectByName('cover');
        if (!object) return;
        object.emitEvent('mouseDown');
        observer.unobserve(entry.target);
      }
    });
  };
  const observerOptions: IntersectionObserverInit = {
    root: null,
    rootMargin: '0px',
    threshold: 0.5,
  };
  const observer = new IntersectionObserver(observerCallback, observerOptions);
  if (targetElement) {
    observer.observe(targetElement);
  }
});
</script>

<template>
  <section id="founders-club" class="relative h-screen">
    <div class="absolute inset-0 w-full h-full">
      <canvas id="founders-club-invite" class="h-full w-full"></canvas>
    </div>
  </section>
</template>
