/** Short page list on a phone; first and last pages return from the sm breakpoint. */
export function usePaginationWindow(desktopSiblingCount = 2) {
  const isWide = useMediaQuery('(min-width: 640px)');

  return {
    siblingCount: computed(() => (isWide.value ? desktopSiblingCount : 1)),
    showEdges: computed(() => isWide.value),
  };
}
