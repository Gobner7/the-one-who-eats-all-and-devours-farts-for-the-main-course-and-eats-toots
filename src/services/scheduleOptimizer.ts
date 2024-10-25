import { EventEmitter } from './eventEmitter';

interface ScheduleResult {
  timestamp: number;
  platforms: string[];
  estimatedEngagement: number;
  audienceOverlap: number;
}

class ScheduleOptimizer extends EventEmitter {
  private readonly PEAK_HOURS = {
    youtube: [14, 15, 16, 20, 21, 22], // Peak hours in 24h format
    tiktok: [9, 10, 11, 19, 20, 21]
  };

  private readonly PLATFORM_WEIGHTS = {
    youtube: 0.6,
    tiktok: 0.4
  };

  constructor() {
    super();
  }

  async getOptimalTime(video: any): Promise<ScheduleResult> {
    try {
      // Analyze historical data
      const historicalData = await this.analyzeHistoricalData();
      
      // Get audience activity patterns
      const activityPatterns = await this.getAudienceActivity();
      
      // Calculate optimal posting time
      const optimalTime = this.calculateOptimalTime(
        historicalData,
        activityPatterns,
        video
      );

      // Determine best platforms
      const platforms = this.determinePlatforms(video, optimalTime);

      return {
        timestamp: optimalTime.timestamp,
        platforms: platforms,
        estimatedEngagement: optimalTime.engagement,
        audienceOverlap: optimalTime.overlap
      };
    } catch (error) {
      console.error('Schedule optimization failed:', error);
      throw new Error('Failed to optimize schedule');
    }
  }

  private async analyzeHistoricalData() {
    // Simulate historical data analysis
    return {
      bestDays: ['Wednesday', 'Thursday', 'Saturday'],
      bestHours: [14, 15, 20, 21],
      engagementPatterns: {
        morning: 0.4,
        afternoon: 0.8,
        evening: 1.0,
        night: 0.6
      }
    };
  }

  private async getAudienceActivity() {
    // Simulate audience activity data
    return {
      activeHours: {
        youtube: this.PEAK_HOURS.youtube,
        tiktok: this.PEAK_HOURS.tiktok
      },
      demographics: {
        age: {
          '13-17': 0.2,
          '18-24': 0.4,
          '25-34': 0.3,
          '35+': 0.1
        },
        regions: {
          'NA': 0.5,
          'EU': 0.3,
          'ASIA': 0.2
        }
      }
    };
  }

  private calculateOptimalTime(
    historicalData: any,
    activityPatterns: any,
    video: any
  ) {
    // Get current time
    const now = new Date();
    
    // Calculate best posting time in next 24 hours
    let bestTime = now.getTime();
    let maxScore = 0;

    for (let hour = 0; hour < 24; hour++) {
      const time = new Date(now);
      time.setHours(hour, 0, 0, 0);
      
      if (time.getTime() < now.getTime()) {
        time.setDate(time.getDate() + 1);
      }

      const score = this.calculateTimeScore(
        time,
        historicalData,
        activityPatterns
      );

      if (score > maxScore) {
        maxScore = score;
        bestTime = time.getTime();
      }
    }

    return {
      timestamp: bestTime,
      engagement: maxScore * 100,
      overlap: 0.85
    };
  }

  private calculateTimeScore(
    time: Date,
    historicalData: any,
    activityPatterns: any
  ): number {
    const hour = time.getHours();
    const dayOfWeek = time.getDay();

    // Combine multiple factors for scoring
    const hourScore = historicalData.bestHours.includes(hour) ? 1 : 0.5;
    const dayScore = historicalData.bestDays.includes(
      ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek]
    ) ? 1 : 0.7;

    let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    if (hour >= 5 && hour < 12) timeOfDay = 'morning';
    else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
    else if (hour >= 17 && hour < 22) timeOfDay = 'evening';
    else timeOfDay = 'night';

    const engagementScore = historicalData.engagementPatterns[timeOfDay];

    // Weighted average of all factors
    return (hourScore * 0.4 + dayScore * 0.3 + engagementScore * 0.3);
  }

  private determinePlatforms(video: any, optimalTime: any): string[] {
    const platforms: string[] = [];
    const hour = new Date(optimalTime.timestamp).getHours();

    // Check YouTube compatibility
    if (this.PEAK_HOURS.youtube.includes(hour)) {
      platforms.push('youtube');
    }

    // Check TikTok compatibility
    if (this.PEAK_HOURS.tiktok.includes(hour)) {
      platforms.push('tiktok');
    }

    // Ensure at least one platform is selected
    if (platforms.length === 0) {
      platforms.push('youtube'); // Default to YouTube
    }

    return platforms;
  }
}

export const scheduleOptimizer = new ScheduleOptimizer();