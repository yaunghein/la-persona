import type { LocationQuery } from 'vue-router';

/** Writes made in the same tick share one `router.replace`, so none is lost. */
let pendingQuery: LocationQuery | null = null;

/**
 * A ref mirrored to `?key=` so filters survive a refresh. The default value is
 * left out of the URL.
 */
export function useQueryState<T extends string>(key: string, defaultValue: T) {
  const route = useRoute();
  const router = useRouter();
  const initial = route.query[key];
  const state = ref(
    typeof initial === 'string' ? initial : defaultValue
  ) as Ref<T>;

  watch(state, (value) => {
    const query = (pendingQuery ??= { ...route.query });
    if (value === defaultValue) delete query[key];
    else query[key] = value;
    nextTick(() => {
      if (pendingQuery !== query) return;
      pendingQuery = null;
      router.replace({ query });
    });
  });

  return state;
}
