import { signedInGuestRedirect } from '~~/shared/utils/routes';

/**
 * Full page loads of the marketing home and sign-in page. In-app navigation
 * is handled by the auth route middleware. API routes never match.
 */
export default defineEventHandler((event) => {
  if (!event.context.principal) return;

  const target = signedInGuestRedirect(event.path, getQuery(event).redirectTo);
  if (!target) return;

  return sendRedirect(event, target, 302);
});
