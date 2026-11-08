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

// ── Community brand assets (Thakhin) ────────────────────────────────────────

export const BRAND_ASSET_KINDS = [
  'wallpaper',
  'back',
  'email-qr',
  'email-contact-exchange',
  'email-after-event',
] as const;

export type BrandAssetKind = (typeof BRAND_ASSET_KINDS)[number];

/** Not every email app shows WebP, so email images are JPG or PNG. */
export function brandAssetContentTypes(
  kind: BrandAssetKind
): readonly UploadContentType[] {
  return kind.startsWith('email-')
    ? ['image/jpeg', 'image/png']
    : UPLOAD_CONTENT_TYPES;
}

export const CreateBrandAssetUploadRequest = CreateUploadRequest.extend({
  kind: z.enum(BRAND_ASSET_KINDS),
}).refine(
  (request) =>
    brandAssetContentTypes(request.kind).includes(request.contentType),
  { path: ['contentType'], message: 'Email images must be JPG or PNG.' }
);

export type CreateBrandAssetUploadRequest = z.infer<
  typeof CreateBrandAssetUploadRequest
>;

export const BrandAssetRouteParams = z.object({
  organizationId: z.string().trim().min(1),
  kind: z.enum(BRAND_ASSET_KINDS),
});

export type BrandAsset = {
  kind: BrandAssetKind;
  fileName: string;
  key: string;
  url: string;
  exists: boolean;
};
