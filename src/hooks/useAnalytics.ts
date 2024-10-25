import { useQuery } from '@tanstack/react-query';

interface AnalyticsData {
  totalViews: number;
  viewsGrowth: number;
  engagementRate: number;
  engagementGrowth: number;
  viralVideos: number;
  viralGrowth: number;
  avgWatchTime: number;
  watchTimeGrowth: number;
  viewsData: Array<{
    date: string;
    views: number;
  }>;
  engagementData: Array<{
    date: string;
    likes: number;
    comments: number;
    shares: number;
  }>;
}

export const useAnalytics = () => {
  return useQuery<AnalyticsData>({
    queryKey: ['analytics'],
    queryFn: async () => {
      // Simulated API call with realistic data
      const dates = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        return date.toISOString().split('T')[0];
      });

      const viewsData = dates.map(date => ({
        date,
        views: Math.floor(50000 + Math.random() * 150000)
      }));

      const engagementData = dates.map(date => ({
        date,
        likes: Math.floor(5000 + Math.random() * 15000),
        comments: Math.floor(1000 + Math.random() * 5000),
        shares: Math.floor(2000 + Math.random() * 8000)
      }));

      return {
        totalViews: 5482930,
        viewsGrowth: 28.5,
        engagementRate: 12.8,
        engagementGrowth: 15.3,
        viralVideos: 23,
        viralGrowth: 45.2,
        avgWatchTime: 42,
        watchTimeGrowth: 18.7,
        viewsData,
        engagementData
      };
    },
    refetchInterval: 300000 // Refetch every 5 minutes
  });
};