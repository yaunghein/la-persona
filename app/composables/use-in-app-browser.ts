import type { MaybeRefOrGetter } from 'vue';

type InAppBrowserName =
  | 'Telegram'
  | 'Messenger'
  | 'Facebook'
  | 'Instagram'
  | 'Viber'
  | 'TikTok'
  | 'LINE';

function detectInAppBrowser(userAgent: string): InAppBrowserName | null {
  // Telegram's user agent is the plain system one; only its JS bridge gives it away.
  if ('TelegramWebview' in window || 'TelegramWebviewProxy' in window)
    return 'Telegram';
  if (/\bFB_IAB\/MESSENGER|\bMessenger/i.test(userAgent)) return 'Messenger';
  if (/FBAN|FBAV|FB_IAB|FBIOS/.test(userAgent)) return 'Facebook';
  if (/Instagram/.test(userAgent)) return 'Instagram';
  if (/Viber/.test(userAgent)) return 'Viber';
  if (/TikTok|musical_ly|BytedanceWebview/.test(userAgent)) return 'TikTok';
  if (/\bLine\//.test(userAgent)) return 'LINE';
  return null;
}

/**
 * URL that hands the current page to the system browser, or null when the
 * platform has no programmatic way out (only the manual steps help there).
 */
function buildExternalBrowserUrl(
  app: InAppBrowserName,
  userAgent: string
): string | null {
  const url = new URL(window.location.href);
  if (app === 'LINE') {
    url.searchParams.set('openExternalBrowser', '1');
    return url.href;
  }

  const scheme = url.protocol.replace(':', '');
  const path = `${url.host}${url.pathname}${url.search}`;

  if (/Android/.test(userAgent)) {
    // An intent without a package opens the user's default browser.
    return app === 'TikTok'
      ? null
      : `intent://${path}#Intent;scheme=${scheme};end`;
  }

  const iosVersion = /(?:iPhone|iPad|iPod).* OS (\d+)_/.exec(userAgent);
  if (iosVersion && Number(iosVersion[1]) >= 17) {
    return `x-safari-${scheme}://${path}`;
  }
  return null;
}

/** What the in-app browser prompt shows about the page being opened. */
export type InAppBrowserPreview = {
  heading: string;
  /** Shown on its own, full width at its own aspect ratio. */
  cardBackUrl?: string | null;
  item?: {
    imageUrl: string | null;
    title: string;
    description?: string | null;
  };
};

const usePreviewState = () =>
  useState<InAppBrowserPreview | null>('in-app-browser-preview', () => null);

/** Lets a page describe itself on the in-app browser prompt while it is open. */
export function useInAppBrowserPreview(
  preview: MaybeRefOrGetter<InAppBrowserPreview | null>
) {
  const state = usePreviewState();
  let current: InAppBrowserPreview | null = null;

  watchEffect(() => {
    current = toValue(preview);
    state.value = current;
  });

  // The next page may already have set its own preview before this one unmounts.
  onScopeDispose(() => {
    if (state.value === current) state.value = null;
  });
}

/**
 * Detects Facebook, Messenger, Telegram and other in-app browsers and offers
 * to reopen the page in the system browser. Runs on the client only.
 */
export function useInAppBrowser() {
  const appName = ref<InAppBrowserName | 'app' | null>(null);
  const externalUrl = ref<string | null>(null);
  const isDismissed = useSessionStorage('lp-in-app-browser:dismissed', false);
  const hasTriedHandoff = useSessionStorage(
    'lp-in-app-browser:tried-handoff',
    false
  );
  const preview = usePreviewState();

  const isPromptVisible = computed(
    () => appName.value !== null && !isDismissed.value
  );
  const canOpenExternally = computed(() => externalUrl.value !== null);

  onMounted(() => {
    const userAgent = navigator.userAgent;
    const app = detectInAppBrowser(userAgent);
    if (app) {
      appName.value = app;
      externalUrl.value = buildExternalBrowserUrl(app, userAgent);
    } else if (/Android/.test(userAgent) && /; wv\)/.test(userAgent)) {
      // Unknown Android WebView: we can only show the manual steps.
      appName.value = 'app';
    }

    // Hand off once per session without a tap, so the app opens the browser
    // straight away; the prompt stays as the fallback. LINE reopens the page
    // with openExternalBrowser, so skip it there to avoid a loop.
    const isReopenedByLine = new URL(window.location.href).searchParams.has(
      'openExternalBrowser'
    );
    if (
      externalUrl.value &&
      !hasTriedHandoff.value &&
      !isDismissed.value &&
      !isReopenedByLine
    ) {
      hasTriedHandoff.value = true;
      if (document.readyState === 'complete') openInBrowser();
      else window.addEventListener('load', openInBrowser, { once: true });
    }
  });

  function openInBrowser() {
    if (!externalUrl.value) return;

    if (appName.value === 'Viber') {
      // Viber ignores top-level intent navigations but honours them from a frame.
      const frame = document.createElement('iframe');
      frame.hidden = true;
      frame.src = externalUrl.value;
      document.body.append(frame);
      setTimeout(() => frame.remove(), 3000);
    } else {
      window.location.href = externalUrl.value;
    }
  }

  function dismiss() {
    isDismissed.value = true;
  }

  return {
    preview,
    isPromptVisible,
    canOpenExternally,
    openInBrowser,
    dismiss,
  };
}
