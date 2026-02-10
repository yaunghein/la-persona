export interface DashboardStats {
  totalStats: {
    type: 'view' | 'social_click' | 'link_click' | 'save_action';
    count: number;
  }[];
  dailyViews: { date: string; count: number }[];
  socialClicks: { platform: string; count: number }[];
  linkClicks: { label: string; count: number }[];
  saveActions: { action: string; count: number }[];
}
