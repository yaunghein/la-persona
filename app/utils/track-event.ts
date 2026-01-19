export const trackEvent = (name: string, params?: object) => {
  const { gtag } = useGtag();
  gtag('event', name, { ...params });
};
