type SourceSubscriptionInput = {
  planCode?: string | null;
  status?: string | null;
  isTrial?: boolean | null;
};

export function derivePlanCodeFromSource(
  sourceSubscription?: SourceSubscriptionInput | null
) {
  const sourcePlanCode = sourceSubscription?.planCode ?? null;

  if (sourcePlanCode === 'founder-club') return 'premium';

  if (
    !sourcePlanCode ||
    sourceSubscription?.isTrial ||
    sourceSubscription?.status === 'trial'
  ) {
    return 'standard';
  }

  return sourcePlanCode;
}

export type SubscriptionStatus =
  | 'trial'
  | 'active'
  | 'grace'
  | 'expired'
  | 'pending_approval'
  | 'submitted'
  | 'rejected';

/**
 * The status as of now. Stored statuses lag behind until the expiry task
 * runs, so reads derive expiry from the period end dates.
 */
export function effectiveSubscriptionStatus(
  status: string,
  trialEndAt?: Date | null,
  currentPeriodEndAt?: Date | null,
  now = new Date()
): SubscriptionStatus {
  if (status === 'trial' && trialEndAt && trialEndAt <= now) return 'expired';
  if (
    (status === 'active' || status === 'grace') &&
    currentPeriodEndAt &&
    currentPeriodEndAt <= now
  ) {
    return 'expired';
  }
  return status as SubscriptionStatus;
}
