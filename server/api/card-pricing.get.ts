import { loadCardPricing } from '~~/server/features/billing/billing.service';
import type { CardPricing } from '~~/shared/contracts/billing';

/** Prices shown when requesting a new card. */
export default defineEventHandler(
  (): Promise<CardPricing> => loadCardPricing()
);
