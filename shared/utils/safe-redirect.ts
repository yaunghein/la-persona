export function getSafeInternalPath(
  value: unknown,
  fallback: string | null = null
): string | null {
  if (typeof value !== 'string') return fallback;

  const path = value.trim();
  if (!path.startsWith('/')) return fallback;
  if (path.startsWith('//') || path.startsWith('/\\')) return fallback;
  if (path.includes('\\')) return fallback;

  return path;
}
