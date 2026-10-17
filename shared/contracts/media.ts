import { z } from 'zod';

/** Raster images only. SVG (scriptable) and anything else are rejected. */
export const UPLOAD_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type UploadContentType = (typeof UPLOAD_CONTENT_TYPES)[number];

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const CreateUploadRequest = z.object({
  contentType: z.enum(UPLOAD_CONTENT_TYPES, {
    message: 'Upload a JPG, PNG or WebP image.',
  }),
  contentLength: z
    .number()
    .int()
    .positive()
    .max(MAX_UPLOAD_BYTES, 'Images must be 5 MB or smaller.'),
});

export type CreateUploadRequest = z.infer<typeof CreateUploadRequest>;

/** Thakhin uploads assets for an organization it is not a member of. */
export const CreateAdminUploadRequest = CreateUploadRequest.extend({
  organizationId: z.string().min(1),
});

export type CreateAdminUploadRequest = z.infer<typeof CreateAdminUploadRequest>;

/**
 * A short-lived presigned PUT. The client must send exactly the declared
 * `Content-Type` and `Content-Length`; S3 rejects anything else.
 */
export type UploadTicket = {
  key: string;
  uploadUrl: string;
  headers: { 'Content-Type': UploadContentType };
  expiresAt: string;
};
