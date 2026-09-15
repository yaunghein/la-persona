export const QUERY_KEYS = {
  organizations: ['organizations'] as const,
  adminOrganizations: ['organizations', 'admin'] as const,
  adminUsers: ['users', 'admin'] as const,
  adminCards: ['cards', 'admin'] as const,
  adminCardOptions: ['cards', 'admin', 'options'] as const,
  unownedCards: ['cards', 'unowned'] as const,
  payments: ['subscriptions', 'payments'] as const,
  cardRequests: ['card-requests'] as const,
  invitations: ['onboarding-invitation'] as const,
  invitationOptions: ['onboarding-invitation', 'options'] as const,
} as const;
