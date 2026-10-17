import type { ApiErrorBody, ApiErrorDetail } from '~~/server/utils/http-errors';

/** The `data` payload every API error carries (`{ code, message, details? }`). */
function apiErrorBody(error: unknown): ApiErrorBody | undefined {
  const body = (error as { data?: { data?: unknown } } | undefined)?.data?.data;
  return body && typeof body === 'object' && 'code' in body
    ? (body as ApiErrorBody)
    : undefined;
}

/** Field-level validation failures, e.g. `[{ field: 'email', message: 'Enter a valid email' }]`. */
export function apiErrorDetails(error: unknown): ApiErrorDetail[] {
  return apiErrorBody(error)?.details ?? [];
}

export function apiErrorCode(error: unknown): string | undefined {
  return apiErrorBody(error)?.code;
}

/** A message safe to show in a toast. */
export function apiErrorMessage(
  error: unknown,
  fallback = 'Please try again.'
): string {
  const data = (error as { data?: { statusMessage?: string } } | undefined)
    ?.data;
  return apiErrorBody(error)?.message || data?.statusMessage || fallback;
}
