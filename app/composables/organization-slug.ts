export function useOrganizationSlug() {
  const route = useRoute();
  const organizationSlug = computed(() => String(route.params.orgSlug || ''));

  function withOrganizationQuery(query: Record<string, unknown> = {}) {
    return {
      ...query,
      organizationSlug: organizationSlug.value,
    };
  }

  return { organizationSlug, withOrganizationQuery };
}
