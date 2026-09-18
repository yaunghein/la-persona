export function parseCardSlugFromQr(value: string) {
  const raw = value.trim();
  if (!raw) return null;

  try {
    const url = new URL(raw, 'https://lapersona.local');
    const match = url.pathname.match(/\/c\/([^/?#]+)/);
    if (match?.[1]) return decodeURIComponent(match[1]);
  } catch {
    // fall through to slug-only values
  }

  if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(raw)) return raw;
  return null;
}
