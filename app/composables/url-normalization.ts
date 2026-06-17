const SCHEME_REGEX = /^[a-z][a-z\d+.-]*:/i;
const IPV4_REGEX = /^(?:\d{1,3}\.){3}\d{1,3}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isGmailLinkLabel(label?: string | null) {
  return String(label || '').trim().toLowerCase() === 'gmail';
}

function normalizeMailto(rawValue?: string | null): string {
  const value = String(rawValue || '').trim();
  if (!value) return '';

  if (value.toLowerCase().startsWith('mailto:')) {
    return value;
  }

  return `mailto:${value.replace(/^https?:\/\//i, '')}`;
}

export function useUrlNormalization() {
  const normalizeUrlWithHttps = (rawValue?: string | null): string => {
    const value = String(rawValue || '').trim();
    if (!value) return '';

    if (value.startsWith('//')) {
      return `https:${value}`;
    }

    if (SCHEME_REGEX.test(value)) {
      return value;
    }

    return `https://${value}`;
  };

  const normalizeCardLinkValue = (
    rawValue?: string | null,
    label?: string | null
  ): string => {
    if (isGmailLinkLabel(label)) {
      return normalizeMailto(rawValue);
    }

    return normalizeUrlWithHttps(rawValue);
  };

  const normalizeLinkValuesWithHttps = <
    T extends { label?: string | null; value?: string | null },
  >(
    links: T[] | undefined | null
  ): T[] => {
    if (!links?.length) return [];

    return links.map((link) => ({
      ...link,
      value: normalizeCardLinkValue(link.value, link.label),
    }));
  };

  const isValidPublicWebUrl = (rawValue?: string | null): boolean => {
    const normalized = normalizeUrlWithHttps(rawValue);
    if (!normalized) return false;

    try {
      const url = new URL(normalized);
      if (!['http:', 'https:'].includes(url.protocol)) return false;

      const hostname = url.hostname.toLowerCase();
      if (!hostname) return false;
      if (hostname === 'localhost') return true;

      if (IPV4_REGEX.test(hostname)) {
        return hostname
          .split('.')
          .every((segment) => Number(segment) >= 0 && Number(segment) <= 255);
      }

      return hostname.includes('.') && !hostname.startsWith('.') && !hostname.endsWith('.');
    } catch {
      return false;
    }
  };

  const isValidCardLinkValue = (
    rawValue?: string | null,
    label?: string | null
  ): boolean => {
    const normalized = normalizeCardLinkValue(rawValue, label);
    if (!normalized) return false;

    if (!isGmailLinkLabel(label)) {
      return isValidPublicWebUrl(normalized);
    }

    const email = normalized.replace(/^mailto:/i, '');
    return EMAIL_REGEX.test(email);
  };

  return {
    normalizeUrlWithHttps,
    normalizeCardLinkValue,
    normalizeLinkValuesWithHttps,
    isValidPublicWebUrl,
    isValidCardLinkValue,
  };
}
