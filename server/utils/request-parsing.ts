import type { H3Event } from 'h3';
import type { z } from 'zod';

/**
 * Typed request input. Each helper rejects with a 400 that names the failing
 * fields (`validationFailed`), so handlers never touch raw input.
 */
export async function parseRequestBody<TSchema extends z.ZodType>(
  event: H3Event,
  schema: TSchema
): Promise<z.output<TSchema>> {
  const result = await readValidatedBody(event, (body) =>
    schema.safeParse(body)
  );
  if (!result.success) throw validationFailed(result.error);
  return result.data;
}

export async function parseRequestQuery<TSchema extends z.ZodType>(
  event: H3Event,
  schema: TSchema
): Promise<z.output<TSchema>> {
  const result = await getValidatedQuery(event, (query) =>
    schema.safeParse(query)
  );
  if (!result.success) throw validationFailed(result.error);
  return result.data;
}

export async function parseRouteParams<TSchema extends z.ZodType>(
  event: H3Event,
  schema: TSchema
): Promise<z.output<TSchema>> {
  const result = await getValidatedRouterParams(
    event,
    (params) => schema.safeParse(params),
    { decode: true }
  );
  if (!result.success) throw validationFailed(result.error);
  return result.data;
}
