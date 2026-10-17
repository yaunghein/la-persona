export default defineAppConfig({
  ui: {
    button: {
      compoundVariants: [
        {
          size: 'md',
          square: false,
          class: { leadingIcon: 'size-4', trailingIcon: 'size-4' },
        },
      ],
    },
    slideover: {
      slots: {
        overlay: 'bg-black/70',
        content: 'bg-[#171717] ring-0 sm:ring-0 shadow-none divide-y-0',
        header: 'border-b-2 border-[#232323] p-6',
        title: 'text-sm font-medium tracking-[1.4px] text-white uppercase',
        body: 'p-6',
        footer:
          'flex-wrap justify-end gap-2 border-t-2 border-[#232323] px-6 py-4',
      },
    },
    modal: {
      slots: {
        overlay: 'bg-black/70',
        content: 'bg-[#171717] ring-0 shadow-none',
      },
      variants: {
        overlay: {
          true: {
            overlay: 'bg-black/70',
          },
        },
        fullscreen: {
          false: {
            content: 'ring-0 shadow-none',
          },
        },
      },
    },
  },
});
