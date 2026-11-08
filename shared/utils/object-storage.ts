import { env } from '~~/env';

/** Hosts that serve objects from the configured S3 bucket. */
export function objectStorageHosts(): string[] {
  return [
    `${env.AWS_BUCKET_NAME}.s3.${env.AWS_REGION}.amazonaws.com`,
    `${env.AWS_BUCKET_NAME}.s3.amazonaws.com`,
  ];
}

export function isObjectStorageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'https:' && objectStorageHosts().includes(parsed.host)
    );
  } catch {
    return false;
  }
}

/** The database stores keys, so a URL in our bucket is reduced to its key. */
export function objectStorageKey(keyOrUrl: string): string {
  if (!isObjectStorageUrl(keyOrUrl)) return keyOrUrl;
  return decodeURIComponent(new URL(keyOrUrl).pathname.slice(1));
}

/**
 * Turns a stored object key (e.g. `uploads/abc.webp`) into its public URL.
 * Absolute (`http(s):`), root-relative and `data:` / `blob:` URLs pass through unchanged.
 */
export function resolveObjectStorageUrl(keyOrUrl?: string | null): string {
  const value = keyOrUrl?.trim();
  if (!value) return '';
  if (/^(https?:|data:|blob:|\/)/.test(value)) return value;
  const encodedKey = value.split('/').map(encodeURIComponent).join('/');
  return `https://${objectStorageHosts()[0]}/${encodedKey}`;
}
