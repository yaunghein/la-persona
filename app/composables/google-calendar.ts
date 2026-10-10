import type { AddToGoogleCalendarResult } from '~~/shared/types/event';
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

/** Pass `orgSlug` on pages without an `[orgSlug]` route param (public event page). */
export function useGoogleCalendar(orgSlug?: MaybeRefOrGetter<string>) {
  const config = useRuntimeConfig();
  const toast = useToast();
  const { organizationSlug: routeOrgSlug } = useOrganizationSlug();
  const organizationSlug = computed(
    () => toValue(orgSlug) || routeOrgSlug.value
  );
  const addingEventId = useState<string | null>(
    'google-calendar-adding',
    () => null
  );

  const isEnabled = computed(() =>
    Boolean(config.public.googleCalendarEnabled)
  );

  function returnUrl(eventId: string, state: 'add' | 'error') {
    return `${ROUTES.EVENTS.PLATFORM_LIST_EVENT(organizationSlug.value, eventId)}&${GOOGLE_CALENDAR_QUERY_KEY}=${state}`;
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

  /** `afterConsent` skips the Google redirect so a declined permission cannot loop. */
  async function addToGoogleCalendar(
    eventId: string,
    options: { afterConsent?: boolean } = {}
  ) {
    if (addingEventId.value) return;
    addingEventId.value = eventId;
    let redirecting = false;

    try {
      const result = await $fetch<AddToGoogleCalendarResult>(
        `/api/events/${eventId}/google-calendar`,
        {
          method: 'POST',
          query: { organizationSlug: organizationSlug.value },
        }
      );

      if (result.status === 'consent_required') {
        if (options.afterConsent) {
          toast.add({
            title: 'Calendar access not granted',
            description:
              'Allow LA PERSONA to add events to your Google Calendar and try again.',
            color: 'error',
          });
          return;
        }
        redirecting = true;
        await requestConsent(eventId);
        return;
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
