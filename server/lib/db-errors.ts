/** Postgres unique violation (23505), also when drizzle or better-auth wrap it in `cause`. */
export function isUniqueViolation(error: unknown) {
  let current = error;
  while (current && typeof current === 'object') {
    if ((current as { code?: unknown }).code === '23505') return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}
