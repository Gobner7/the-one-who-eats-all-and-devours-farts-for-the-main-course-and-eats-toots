import { useQuery } from '@tanstack/react-query';
import { videoAnalyzer } from '../services/videoAnalyzer';
import { profitOptimizer } from '../services/profitOptimizer';

interface VideoStats {
  totalRevenue: number;
  revenueTrend: number;
  totalViews: number;
  viewsTrend: number;
  processedVideos: number;
  queuedVideos: number;
  engagementRate: number;
  engagementTrend: number;
  youtubeViews: number;
  youtubePercentage: number;
  tiktokViews: number;
  tiktokPercentage: number;
  revenueData: Array<{
    date: string;
    revenue: number;
  }>;
}

export const useVideoStats = () => {
  return useQuery<VideoStats>({
    queryKey: ['video-stats'],
    queryFn: async () => {
      const analyzerStats = await videoAnalyzer.getStats();
      const strategies = await profitOptimizer.getAvailableStrategies();
      
      // Calculate revenue data
      const revenueData = analyzerStats.performanceData.map(data => ({
        date: data.date,
        revenue: (data.views / 1000) * 2.5 // Assuming $2.50 CPM
      }));

      // Calculate platform percentages
      const totalPlatformViews = analyzerStats.platformStats.youtube + analyzerStats.platformStats.tiktok;
      const youtubePercentage = (analyzerStats.platformStats.youtube / totalPlatformViews) * 100;
      const tiktokPercentage = (analyzerStats.platformStats.tiktok / totalPlatformViews) * 100;

      return {
        totalRevenue: revenueData.reduce((sum, data) => sum + data.revenue, 0),
        revenueTrend: 28.5,
        totalViews: analyzerStats.totalViews,
        viewsTrend: 32.7,
        processedVideos: analyzerStats.processedCount,
        queuedVideos: 12, // This should come from queue store
        engagementRate: 15.8,
        engagementTrend: 12.4,
        youtubeViews: analyzerStats.platformStats.youtube,
        youtubePercentage,
        tiktokViews: analyzerStats.platformStats.tiktok,
        tiktokPercentage,
        revenueData
      };
    },
    refetchInterval: 5000 // Refresh every 5 seconds
  });
};