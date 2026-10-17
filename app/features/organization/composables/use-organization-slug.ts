/** The `[orgSlug]` of the current platform route. */
export function useOrganizationSlug() {
  const route = useRoute();
  const organizationSlug = computed(() => String(route.params.orgSlug || ''));
  return { organizationSlug };
}
