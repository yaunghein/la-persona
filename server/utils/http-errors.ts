import type { z } from 'zod';

/**
 * One error shape for every API failure:
 * `{ statusCode, statusMessage, data: { code, message, details? } }`.
 * `statusMessage` stays human readable because the client toasts it.
 */
export type ApiErrorDetail = { field: string; message: string };

export type ApiErrorBody = {
  code: string;
  message: string;
  details?: ApiErrorDetail[];
};

function apiError(
  statusCode: number,
  code: string,
  message: string,
  details?: ApiErrorDetail[]
) {
  const data: ApiErrorBody = details?.length
    ? { code, message, details }
    : { code, message };
  return createError({ statusCode, statusMessage: message, data });
}

export function badRequest(message: string, code = 'bad_request') {
  return apiError(400, code, message);
}

/** Names the failing fields only; submitted values are never echoed or logged. */
export function validationFailed(error: z.ZodError) {
  const details = error.issues.map((issue) => ({
    field: issue.path.map(String).join('.') || '(root)',
    message: issue.message,
  }));
  const fields = [...new Set(details.map((detail) => detail.field))];
  return apiError(
    400,
    'validation_failed',
    `Invalid ${fields.join(', ')}`,
    details
  );
}

export function unauthorized(message = 'Sign in to continue.') {
  return apiError(401, 'unauthorized', message);
}

export function forbidden(
  message = 'You do not have permission to do this.',
  code = 'forbidden'
) {
  return apiError(403, code, message);
}

export function notFound(resource = 'Resource') {
  return apiError(404, 'not_found', `${resource} not found.`);
}

export function conflict(message: string, code = 'conflict') {
  return apiError(409, code, message);
}

export function unsupportedMediaType(message: string) {
  return apiError(415, 'unsupported_media_type', message);
}

export function upstreamFailed(message: string, code = 'upstream_failed') {
  return apiError(502, code, message);
}
