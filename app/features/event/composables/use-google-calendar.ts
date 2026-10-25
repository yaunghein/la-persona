import { env } from '~~/env';
import {
  GOOGLE_CALENDAR_QUERY_KEY,
  GOOGLE_CALENDAR_SCOPE,
} from '~~/shared/constants/google-calendar';
import { ROUTES } from '~~/shared/utils/routes';

const CONSENT_ERROR_MESSAGES: Record<string, string> = {
  "email_doesn't_match":
    'Use the Google account with the same email as your LA PERSONA account.',
  account_already_linked_to_different_user:
    'That Google account is linked to another LA PERSONA user.',
};

/**
 * Pass `orgSlug` on pages without an `[orgSlug]` route param (public event page).
 * Pass `returnPath` to come back to the current page after Google consent
 * instead of the platform events list.
 */
export function useGoogleCalendar(
  orgSlug?: MaybeRefOrGetter<string>,
  config: { returnPath?: MaybeRefOrGetter<string> } = {}
) {
  const toast = useToast();
  const { organizationSlug: routeOrgSlug } = useOrganizationSlug();
  const organizationSlug = computed(
    () => toValue(orgSlug) || routeOrgSlug.value
  );
  const addingEventId = useState<string | null>(
    'google-calendar-adding',
    () => null
  );

  const isEnabled = computed(() => env.GOOGLE_CALENDAR_ENABLED);

  function returnUrl(eventId: string, state: 'add' | 'error') {
    const path =
      toValue(config.returnPath) ||
      ROUTES.EVENTS.PLATFORM_LIST_EVENT(organizationSlug.value, eventId);
    return `${path}${path.includes('?') ? '&' : '?'}${GOOGLE_CALENDAR_QUERY_KEY}=${state}`;
  }

  async function requestConsent(eventId: string) {
    const { error } = await authClient.linkSocial({
      provider: 'google',
      scopes: [GOOGLE_CALENDAR_SCOPE],
      callbackURL: returnUrl(eventId, 'add'),
      errorCallbackURL: returnUrl(eventId, 'error'),
    });
    if (error) throw new Error(error.message || 'Could not open Google.');
  }

  /**
   * `afterConsent` skips the Google redirect so a declined permission cannot loop.
   * Resolves `true` once the event is on the calendar.
   */
  async function addToGoogleCalendar(
    eventId: string,
    options: { afterConsent?: boolean } = {}
  ) {
    if (addingEventId.value) return false;
    addingEventId.value = eventId;
    let redirecting = false;

    try {
      const result = await addEventToGoogleCalendar(eventId);

      if (result.status === 'consent_required') {
        if (options.afterConsent) {
          toast.add({
            title: 'Calendar access not granted',
            description:
              'Allow LA PERSONA to add events to your Google Calendar and try again.',
            color: 'error',
          });
          return false;
        }
        redirecting = true;
        await requestConsent(eventId);
        return false;
      }

      toast.add({
        title:
          result.status === 'updated'
            ? 'Google Calendar updated'
            : 'Added to Google Calendar',
        description: 'The event is on your Google Calendar.',
        color: 'success',
        actions: result.htmlLink
          ? [
              {
                label: 'Open',
                color: 'neutral',
                variant: 'outline',
                to: result.htmlLink,
                target: '_blank',
              },
            ]
          : undefined,
      });
      return true;
    } catch (error: any) {
      redirecting = false;
      toast.add({
        title: 'Could not add to Google Calendar',
        description:
          error?.data?.statusMessage ||
          error?.statusMessage ||
          error?.message ||
          'Try again.',
        color: 'error',
      });
    } finally {
      if (!redirecting) addingEventId.value = null;
    }
    return false;
  }

  function showConsentError(code: unknown) {
    toast.add({
      title: 'Could not connect Google Calendar',
      description:
        (typeof code === 'string' && CONSENT_ERROR_MESSAGES[code]) ||
        'Google sign-in was cancelled or failed. Try again.',
      color: 'error',
    });
  }

  return { isEnabled, addingEventId, addToGoogleCalendar, showConsentError };
}

/**
 * "Add to Google Calendar" on the registration success screen. Google consent
 * returns to `returnPath`; once `isRegistered` is true the pending add (or the
 * consent error) is resumed and the return params are dropped from the URL.
 */
export function useRegisteredEventCalendar(input: {
  eventId: MaybeRefOrGetter<string>;
  orgSlug: MaybeRefOrGetter<string>;
  endsAt: MaybeRefOrGetter<string | null | undefined>;
  isRegistered: MaybeRefOrGetter<boolean>;
  returnPath: MaybeRefOrGetter<string>;
}) {
  const route = useRoute();
  const router = useRouter();
  const isMounted = useMounted();
  const { isEnabled, addingEventId, addToGoogleCalendar, showConsentError } =
    useGoogleCalendar(input.orgSlug, { returnPath: input.returnPath });
  let consentState = route.query[GOOGLE_CALENDAR_QUERY_KEY];
  const consentError = route.query.error;
  const isAdded = ref(false);

  const canAdd = computed(() => {
    const endsAt = toValue(input.endsAt);
    return (
      isMounted.value &&
      isEnabled.value &&
      toValue(input.isRegistered) &&
      Boolean(endsAt) &&
      new Date(endsAt!).getTime() > Date.now()
    );
  });
  const isAdding = computed(
    () => addingEventId.value === toValue(input.eventId)
  );

  async function add(options: { afterConsent?: boolean } = {}) {
    if (await addToGoogleCalendar(toValue(input.eventId), options)) {
      isAdded.value = true;
    }
  }

  watch(
    () => toValue(input.isRegistered),
    (isRegistered) => {
      if (!import.meta.client || !isRegistered || !consentState) return;
      if (consentState === 'add') {
        add({ afterConsent: true });
      } else {
        showConsentError(consentError);
      }
      consentState = undefined;

      if (!route.query[GOOGLE_CALENDAR_QUERY_KEY]) return;
      const query = { ...route.query };
      delete query[GOOGLE_CALENDAR_QUERY_KEY];
      delete query.error;
      delete query.error_description;
      router.replace({ path: route.path, query });
    },
    { immediate: true }
  );

  return { canAdd, isAdding, isAdded, add };
}
