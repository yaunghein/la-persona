const FORM_DRAFT_PREFIX = 'form-draft:';

function snapshot(value: unknown) {
  return JSON.stringify(value);
}

function readDraft<T>(storageKey: string): Partial<T> | null {
  if (!import.meta.client) return null;
  try {
    const raw = sessionStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as Partial<T>) : null;
  } catch {
    return null;
  }
}

/**
 * Keeps unsaved form values in sessionStorage so they survive unmounts
 * (steps, tabs, slideovers, navigation) and reloads. Server data passed to
 * `hydrate` never overwrites unsaved edits. Values must be JSON-safe.
 */
export function useFormDraft<T extends object>(
  key: MaybeRefOrGetter<string>,
  initial: () => T
) {
  const storageKey = computed(() => `${FORM_DRAFT_PREFIX}${toValue(key)}`);
  const state = reactive(initial()) as T;
  const baseline = ref('');
  const isDirty = computed(() => snapshot(state) !== baseline.value);

  function load() {
    const base = initial();
    baseline.value = snapshot(base);
    Object.assign(state, base, readDraft<T>(storageKey.value) ?? {});
  }

  load();
  watch(storageKey, load);

  watch(
    state,
    () => {
      if (!import.meta.client) return;
      if (isDirty.value) {
        sessionStorage.setItem(storageKey.value, snapshot(state));
      } else {
        sessionStorage.removeItem(storageKey.value);
      }
    },
    { deep: true }
  );

  function hydrate(server: Partial<T>) {
    const keepEdits = isDirty.value;
    const next = { ...initial(), ...server };
    baseline.value = snapshot(next);
    if (!keepEdits) Object.assign(state, next);
  }

  function clear() {
    baseline.value = snapshot(state);
    clearFormDraft(toValue(key));
  }

  function reset() {
    const base = initial();
    baseline.value = snapshot(base);
    Object.assign(state, base);
    clearFormDraft(toValue(key));
  }

  return { state, isDirty, hydrate, clear, reset };
}

export function clearFormDraft(key: string) {
  if (!import.meta.client) return;
  sessionStorage.removeItem(`${FORM_DRAFT_PREFIX}${key}`);
}

export function clearFormDrafts() {
  if (!import.meta.client) return;
  for (const key of Object.keys(sessionStorage)) {
    if (key.startsWith(FORM_DRAFT_PREFIX)) sessionStorage.removeItem(key);
  }
}
