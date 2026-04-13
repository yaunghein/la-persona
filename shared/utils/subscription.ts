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
