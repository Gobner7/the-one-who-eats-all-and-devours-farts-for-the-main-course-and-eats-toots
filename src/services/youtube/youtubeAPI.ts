import { EventEmitter } from '../eventEmitter';

interface YouTubeStats {
  views: number;
  subscribers: number;
  videos: number;
  revenue: number;
  watchTime: number;
  engagement: {
    likes: number;
    comments: number;
    shares: number;
  };
  demographics: {
    ageRanges: Record<string, number>;
    genders: Record<string, number>;
    countries: Record<string, number>;
  };
}

class YouTubeAPI extends EventEmitter {
  private readonly API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
  private readonly CHANNEL_ID = import.meta.env.VITE_YOUTUBE_CHANNEL_ID;
  private readonly BASE_URL = 'https://www.googleapis.com/youtube/v3';
  private accessToken: string | null = null;

  constructor() {
    super();
    this.initialize();
  }

  private async initialize() {
    try {
      await this.authenticate();
      this.startTokenRefreshInterval();
      this.emit('initialized');
    } catch (error) {
      console.error('YouTube API initialization failed:', error);
      this.emit('error', error);
    }
  }

  private async authenticate() {
    // Implement OAuth2 authentication
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?
      client_id=${import.meta.env.VITE_GOOGLE_CLIENT_ID}&
      redirect_uri=${window.location.origin}/auth/callback&
      response_type=token&
      scope=https://www.googleapis.com/auth/youtube.readonly
             https://www.googleapis.com/auth/youtube.upload
             https://www.googleapis.com/auth/youtubepartner`;

    // Handle OAuth flow
    if (!this.accessToken) {
      window.location.href = authUrl;
    }
  }

  private startTokenRefreshInterval() {
    setInterval(() => {
      this.refreshAccessToken();
    }, 3300000); // Refresh every 55 minutes
  }

  private async refreshAccessToken() {
    // Implement token refresh logic
  }

  async getChannelStats(): Promise<YouTubeStats> {
    const [basicStats, analyticsData] = await Promise.all([
      this.getBasicStats(),
      this.getAnalytics()
    ]);

    return {
      ...basicStats,
      ...analyticsData
    };
  }

  private async getBasicStats() {
    const response = await fetch(
      `${this.BASE_URL}/channels?part=statistics&id=${this.CHANNEL_ID}&key=${this.API_KEY}`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch channel statistics');
    }

    const data = await response.json();
    return data.items[0].statistics;
  }

  private async getAnalytics() {
    const endDate = new Date().toISOString();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 28);

    const response = await fetch(
      `${this.BASE_URL}/reports?dimensions=day&metrics=views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained&startDate=${startDate.toISOString()}&endDate=${endDate}`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch analytics data');
    }

    return response.json();
  }

  async uploadVideo(videoData: {
    file: File;
    title: string;
    description: string;
    tags: string[];
    privacyStatus: 'private' | 'unlisted' | 'public';
  }) {
    const metadata = {
      snippet: {
        title: videoData.title,
        description: videoData.description,
        tags: videoData.tags,
        categoryId: '22' // People & Blogs
      },
      status: {
        privacyStatus: videoData.privacyStatus,
        selfDeclaredMadeForKids: false
      }
    };

    const response = await fetch(
      `${this.BASE_URL}/videos?part=snippet,status&key=${this.API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(metadata)
      }
    );

    if (!response.ok) {
      throw new Error('Failed to upload video');
    }

    return response.json();
  }

  async getVideoPerformance(videoId: string) {
    const response = await fetch(
      `${this.BASE_URL}/videos?part=statistics&id=${videoId}&key=${this.API_KEY}`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch video performance');
    }

    return response.json();
  }

  async getBestUploadTimes(): Promise<{
    weekday: number;
    hour: number;
    engagement: number;
  }[]> {
    const response = await fetch(
      `${this.BASE_URL}/reports?dimensions=day,hour&metrics=views,estimatedMinutesWatched,averageViewPercentage&sort=-views`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch best upload times');
    }

    return response.json();
  }
}

export const youtubeAPI = new YouTubeAPI();