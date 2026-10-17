import { expireLapsedSubscriptions } from '~~/server/features/billing/billing.repository';
import { logger } from '~~/server/utils/logger';

/**
 * Persists expiry for trials and paid terms that have ended. Reads already
 * derive the effective status, so this only keeps stored statuses (admin
 * filters, reports) in sync. Idempotent; safe on every instance.
 */
export default defineTask({
  meta: {
    name: 'subscriptions:expire',
    description: 'Mark lapsed card subscriptions as expired',
  },
  async run() {
    const expired = await expireLapsedSubscriptions();
    if (expired > 0) logger.info({ task: 'subscriptions:expire', expired });
    return { result: { expired } };
  },
});
