import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { videoAnalyzer } from '../services/videoAnalyzer';
import { contentOptimizer } from '../services/contentOptimizer';
import { scheduleOptimizer } from '../services/scheduleOptimizer';

interface QueueStore {
  queue: Video[];
  isProcessing: boolean;
  progress: number;
  stats: QueueStats;
  addToQueue: (videos: Video[]) => void;
  startProcessing: () => Promise<void>;
  stopProcessing: () => void;
  clearQueue: () => void;
  updateProgress: (progress: number) => void;
}

interface Video {
  id: string;
  title: string;
  thumbnail?: string;
  viralScore: number;
  estimatedViews: number;
  platforms: string[];
  scheduledTime: number;
  copyrightRisk: number;
  sourceUrl: string;
}

interface QueueStats {
  averageViralScore: number;
  estimatedDailyViews: number;
  uploadsPerDay: number;
}

export const useVideoQueue = create<QueueStore>((set, get) => ({
  queue: [],
  isProcessing: false,
  progress: 0,
  stats: {
    averageViralScore: 0,
    estimatedDailyViews: 0,
    uploadsPerDay: 0
  },

  addToQueue: async (videos) => {
    const optimizedVideos = await Promise.all(
      videos.map(async (video) => {
        // Analyze viral potential and copyright risk
        const analysis = await videoAnalyzer.analyze(video.sourceUrl);
        
        // Optimize content for maximum engagement
        const optimized = await contentOptimizer.optimize(video, analysis);
        
        // Get optimal posting schedule
        const schedule = await scheduleOptimizer.getOptimalTime(optimized);

        return {
          ...optimized,
          id: uuidv4(),
          scheduledTime: schedule.timestamp,
          viralScore: analysis.viralScore,
          copyrightRisk: analysis.copyrightRisk,
          estimatedViews: analysis.estimatedViews,
          platforms: schedule.platforms
        };
      })
    );

    // Sort by viral potential and scheduled time
    const sortedVideos = optimizedVideos.sort((a, b) => {
      if (a.viralScore === b.viralScore) {
        return a.scheduledTime - b.scheduledTime;
      }
      return b.viralScore - a.viralScore;
    });

    set((state) => ({
      queue: [...state.queue, ...sortedVideos],
      stats: {
        averageViralScore: sortedVideos.reduce((acc, vid) => acc + vid.viralScore, 0) / sortedVideos.length,
        estimatedDailyViews: sortedVideos.reduce((acc, vid) => acc + vid.estimatedViews, 0),
        uploadsPerDay: Math.ceil(sortedVideos.length / 7) // Weekly schedule
      }
    }));
  },

  startProcessing: async () => {
    const state = get();
    if (state.isProcessing || state.queue.length === 0) return;

    set({ isProcessing: true });

    for (const video of state.queue) {
      if (!get().isProcessing) break;

      try {
        await videoAnalyzer.process(video);
        set((state) => ({
          progress: ((state.queue.indexOf(video) + 1) / state.queue.length) * 100
        }));
      } catch (error) {
        console.error('Processing error:', error);
      }
    }

    set({ isProcessing: false, progress: 0 });
  },

  stopProcessing: () => {
    set({ isProcessing: false });
  },

  clearQueue: () => {
    set({ 
      queue: [],
      progress: 0,
      stats: {
        averageViralScore: 0,
        estimatedDailyViews: 0,
        uploadsPerDay: 0
      }
    });
  },

  updateProgress: (progress) => {
    set({ progress });
  }
}));