export default defineAppConfig({
  ui: {
    slideover: {
      slots: {
        overlay: 'bg-black/70',
        content: 'bg-[#171717] ring-0 sm:ring-0 shadow-none',
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
