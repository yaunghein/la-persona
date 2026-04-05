import { z } from 'zod';

/**
 * Optional absolute URL (e.g. Spline scene, avatar).
 * Omitted → undefined (PATCH skip). Empty / null → null.
 */
export const optionalHttpUrl = z
  .union([z.undefined(), z.null(), z.literal(''), z.string().url()])
  .transform((v) => {
    if (v === undefined) return undefined;
    if (v === null || v === '') return null;
    return v;
  });

/**
 * S3 object key (path), not an http(s) URL.
 * - Omitted (`undefined`) stays undefined (PATCH: do not update).
 * - `null` or empty string → `null` (clear value).
 */
export function optionalS3ObjectKey(fieldLabel: string) {
  return z
    .union([z.undefined(), z.null(), z.string()])
    .transform((v) => {
      if (v === undefined) return undefined;
      if (v === null) return null;
      const t = v.trim();
      return t === '' ? null : t;
    })
    .superRefine((val, ctx) => {
      if (val === undefined || val === null) return;
      if (/^https?:\/\//i.test(val)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${fieldLabel} must be an S3 object key (path), not a URL`,
        });
      }
    });
}
