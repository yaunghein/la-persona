/**
 * Opens a feature guide automatically the first time a user visits a section,
 * then remembers (per user, in localStorage) that it has been seen.
 */
export async function useFirstVisitGuide(section: string) {
  const isOpen = ref(false);
  const { data: session } = await authClient.useSession(useFetch);
  const hasSeen = useLocalStorage(
    `lp-info-popup:${section}:${session.value?.user.id || 'anonymous'}`,
    false
  );

  onMounted(() => {
    if (hasSeen.value) return;
    isOpen.value = true;
    hasSeen.value = true;
  });

  return isOpen;
}
