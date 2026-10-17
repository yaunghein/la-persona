<script setup lang="ts">
export type FeatureGuideItem = {
  icon: string;
  title: string;
  description: string;
};

defineProps<{
  title: string;
  heading: string;
  description: string;
  items: FeatureGuideItem[];
}>();

const open = defineModel<boolean>('open', { required: true });

function close() {
  open.value = false;
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="title"
    :ui="{
      content: 'sm:max-w-[480px] rounded-lg bg-[#171717]',
      title: 'text-sm font-medium uppercase tracking-widest text-white',
      body: 'px-5 py-4 sm:px-6 sm:py-5',
    }"
  >
    <template #body>
      <div class="space-y-5 sm:space-y-6">
        <div class="space-y-2">
          <h3
            class="text-lg font-medium leading-tight tracking-widest uppercase text-white sm:text-xl"
          >
            {{ heading }}
          </h3>
          <p class="text-sm leading-relaxed text-[#8b8b8b]">
            {{ description }}
          </p>
        </div>

        <ul>
          <li
            v-for="(item, index) in items"
            :key="item.title"
            class="py-3 sm:py-3.5"
            :class="index < items.length - 1 && 'border-b border-[#2a2a2a]'"
          >
            <div class="flex items-start gap-3">
              <UIcon
                :name="item.icon"
                class="mt-0.5 size-4.5 shrink-0 text-white sm:size-5"
              />
              <div class="min-w-0">
                <p class="text-sm font-medium text-white">{{ item.title }}</p>
                <p class="mt-1.5 text-sm leading-relaxed text-[#8b8b8b]">
                  {{ item.description }}
                </p>
              </div>
            </div>
          </li>
        </ul>

        <div class="flex justify-end">
          <UButton
            size="md"
            label="Understood"
            color="neutral"
            class="h-10 justify-center rounded-full bg-white px-5 font-medium text-dark hover:bg-white/90"
            @click="close"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
