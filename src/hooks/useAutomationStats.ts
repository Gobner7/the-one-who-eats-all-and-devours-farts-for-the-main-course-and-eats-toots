import { useQuery } from '@tanstack/react-query';
import { videoAnalyzer } from '../services/videoAnalyzer';

interface AutomationStats {
  processedCount: number;
  averageViews: number;
  successRate: number;
  averageProcessingTime: number;
  performanceData: {
    date: string;
    views: number;
    engagement: number;
  }[];
  platformStats: {
    youtube: number;
    tiktok: number;
  };
}

export const useAutomationStats = () => {
  return useQuery<AutomationStats>({
    queryKey: ['automation-stats'],
    queryFn: async () => {
      const stats = await videoAnalyzer.getStats();
      return stats;
    },
    refetchInterval: 5000 // Real-time updates every 5 seconds
  });
};