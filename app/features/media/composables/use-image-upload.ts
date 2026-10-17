import imageCompression from 'browser-image-compression';
import type { UploadTicket } from '~~/shared/contracts/media';

export type ImageUploadTarget =
  | { organizationSlug: string }
  /** Thakhin uploading for an organization it does not belong to. */
  | { organizationId: string };

export type ImageCompressionOptions = {
  maxSizeMB: number;
  maxWidthOrHeight: number;
};

/**
 * Compresses an image, requests a presigned upload ticket and PUTs the file to
 * object storage. Resolves to the stored object key.
 */
export async function uploadImage(
  file: File,
  target: ImageUploadTarget,
  compression: ImageCompressionOptions
): Promise<string> {
  const compressed = await imageCompression(file, compression);
  const request = {
    contentType: compressed.type,
    contentLength: compressed.size,
  };

  const ticket =
    'organizationId' in target
      ? await $fetch<UploadTicket>('/api/admin/uploads', {
          method: 'POST',
          body: { ...request, organizationId: target.organizationId },
        })
      : await $fetch<UploadTicket>(
          `/api/organizations/${target.organizationSlug}/uploads`,
          { method: 'POST', body: request }
        );

  const response = await fetch(ticket.uploadUrl, {
    method: 'PUT',
    body: compressed,
    headers: ticket.headers,
  });
  if (!response.ok) throw new Error('Upload failed. Please try again.');

  return ticket.key;
}

export function imageProxyUrl(imageUrl: string): string {
  return `/api/public/image-proxy?url=${encodeURIComponent(imageUrl)}`;
}
