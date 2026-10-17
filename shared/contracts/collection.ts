import { z } from 'zod';

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

/** `?limit=&offset=` with a default and a hard cap (larger limits are clamped). */
export const PaginationQuery = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .default(DEFAULT_PAGE_SIZE)
    .transform((limit) => Math.min(limit, MAX_PAGE_SIZE)),
  offset: z.coerce.number().int().min(0).default(0),
});

export type PaginationQuery = z.output<typeof PaginationQuery>;

/**
 * Back-office tables filter and page in the browser, so admin lists return a
 * larger (still bounded) page.
 */
export const MAX_ADMIN_PAGE_SIZE = 500;

export const AdminPaginationQuery = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .default(MAX_ADMIN_PAGE_SIZE)
    .transform((limit) => Math.min(limit, MAX_ADMIN_PAGE_SIZE)),
  offset: z.coerce.number().int().min(0).default(0),
});

/** `?sort=field` (ascending) or `?sort=-field` (descending), limited to `fields`. */
export function sortQuery<const TField extends string>(
  fields: readonly [TField, ...TField[]],
  defaultSort: `${TField}` | `-${TField}`
) {
  const allowed = new Set<string>(
    fields.flatMap((field) => [field, `-${field}`])
  );
  return z
    .string()
    .default(defaultSort)
    .refine((value) => allowed.has(value), {
      message: `Sort by one of: ${fields.join(', ')}`,
    })
    .transform((value) => ({
      field: value.replace(/^-/, '') as TField,
      direction: value.startsWith('-') ? ('desc' as const) : ('asc' as const),
    }));
}

/** A page of a paginated collection. */
export type Page<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};

/** A small, bounded collection returned in full (no paging parameters). */
export type Collection<T> = {
  items: T[];
};
