export type AdminOverview = {
  census: {
    users: number;
    dailyActive: { today: number; yesterday: number };
    cards: { total: number; claimed: number; unclaimed: number };
    organizations: { total: number; personal: number; community: number };
    communities: number;
    analytics: {
      total: number;
      today: number;
      byType: {
        view: number;
        social_click: number;
        link_click: number;
        save_action: number;
      };
    };
    contactExchanges: number;
    events: number;
    liveSubscriptions: number;
  };
  queues: {
    designRequests: { count: number; oldestAgeHours: number | null };
    standalonePayments: { count: number };
    updateRequests: { count: number };
    expiringInvitations: { count: number };
  };
  month: {
    revenue: { current: number; previous: number; currency: string };
    newUsers: { current: number; previous: number };
    cardsCreated: { current: number; previous: number };
    liveSubscriptions: number;
    graceOrExpired: number;
    invitations: {
      sent: number;
      accepted: number;
      previousSent: number;
      previousAccepted: number;
    };
  };
  series: {
    dailyActive: { day: string; count: number }[];
    analytics: { day: string; views: number; other: number }[];
    revenue: { week: string; amountMinor: number }[];
  };
};

export type AdminSearchResult = {
  users: { id: string; label: string; href: string }[];
  organizations: { id: string; label: string; href: string }[];
  cards: { id: string; label: string; href: string }[];
};
