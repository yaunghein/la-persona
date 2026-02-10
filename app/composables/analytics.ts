export const useAnalytics = () => {
  const trackEvent = async (params: {
    cardId: string;
    organizationId: string;
    userId?: string | null;
    type: 'view' | 'social_click' | 'link_click' | 'save_action';
    metadata?: any;
  }) => {
    // use $fetch.raw and don't await it to prevent blocking the UI
    $fetch('/api/analytics', {
      method: 'POST',
      body: params,
    }).catch((err) => console.error('Analytics Error:', err));
  };

  return { trackEvent };
};
