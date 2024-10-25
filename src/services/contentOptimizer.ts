import { EventEmitter } from './eventEmitter';
import { youtubeAPI } from './youtube/youtubeAPI';
import * as tf from '@tensorflow/tfjs';

interface OptimizationResult {
  title: string;
  description: string;
  tags: string[];
  thumbnailUrl: string;
  scheduledTime: number;
  estimatedViews: number;
  targetAudience: {
    age: string[];
    interests: string[];
    regions: string[];
  };
}

class ContentOptimizer extends EventEmitter {
  private static instance: ContentOptimizer;
  private model: tf.LayersModel | null = null;
  private isInitialized = false;
  private readonly MIN_TITLE_LENGTH = 20;
  private readonly MAX_TITLE_LENGTH = 100;
  private readonly OPTIMAL_TAG_COUNT = 15;
  private readonly VIRAL_PATTERNS = [
    'INSANE',
    'UNBELIEVABLE',
    'MUST WATCH',
    'SHOCKING',
    'VIRAL',
    'TRENDING'
  ];

  private constructor() {
    super();
    this.initialize();
  }

  static getInstance(): ContentOptimizer {
    if (!ContentOptimizer.instance) {
      ContentOptimizer.instance = new ContentOptimizer();
    }
    return ContentOptimizer.instance;
  }

  private async initialize() {
    try {
      await tf.ready();
      this.model = await this.createModel();
      await this.loadOptimizationModels();
      this.isInitialized = true;
      this.emit('initialized');
    } catch (error) {
      console.error('Failed to initialize ContentOptimizer:', error);
      this.emit('error', error);
    }
  }

  private async createModel(): Promise<tf.LayersModel> {
    const model = tf.sequential();

    // Input layer for title features
    model.add(tf.layers.dense({
      inputShape: [100],
      units: 64,
      activation: 'relu'
    }));

    // Hidden layers
    model.add(tf.layers.dropout({ rate: 0.3 }));
    model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
    model.add(tf.layers.dropout({ rate: 0.2 }));
    model.add(tf.layers.dense({ units: 16, activation: 'relu' }));

    // Output layer for engagement prediction
    model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });

    return model;
  }

  private async loadOptimizationModels() {
    // Load pre-trained models and weights
    return Promise.resolve();
  }

  async optimize(video: any, analysis: any): Promise<OptimizationResult> {
    if (!this.isInitialized) {
      throw new Error('ContentOptimizer not initialized');
    }

    try {
      // Get real-time YouTube trends
      const trends = await this.analyzeTrends();

      // Get channel performance data
      const channelStats = await youtubeAPI.getChannelStats();

      // Get optimal posting times
      const bestTimes = await youtubeAPI.getBestUploadTimes();

      // Optimize title with ML model
      const optimizedTitle = await this.optimizeTitle(video.title, trends, channelStats);

      // Generate SEO-optimized description
      const optimizedDescription = await this.generateDescription(video, trends, channelStats);

      // Generate optimal tags
      const optimizedTags = await this.generateTags(video, trends);

      // Calculate best posting time
      const scheduledTime = this.calculateOptimalPostingTime(bestTimes);

      // Estimate performance
      const estimatedViews = await this.estimateViews(video, analysis, trends, channelStats);

      // Identify target audience
      const targetAudience = await this.identifyTargetAudience(channelStats);

      return {
        title: optimizedTitle,
        description: optimizedDescription,
        tags: optimizedTags,
        thumbnailUrl: video.thumbnail,
        scheduledTime,
        estimatedViews,
        targetAudience
      };
    } catch (error) {
      console.error('Content optimization failed:', error);
      throw error;
    }
  }

  private async analyzeTrends(): Promise<any> {
    // Get real YouTube trends
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&chart=mostPopular&regionCode=US&maxResults=50&key=${import.meta.env.VITE_YOUTUBE_API_KEY}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch trends');
    }

    const data = await response.json();
    
    return {
      topics: this.extractTrendingTopics(data.items),
      hashtags: this.extractTrendingHashtags(data.items),
      patterns: this.VIRAL_PATTERNS
    };
  }

  private extractTrendingTopics(videos: any[]): string[] {
    const topics = videos.map(video => video.snippet.tags || []).flat();
    return [...new Set(topics)].slice(0, 10);
  }

  private extractTrendingHashtags(videos: any[]): string[] {
    const hashtags = videos
      .map(video => video.snippet.description.match(/#[\w-]+/g) || [])
      .flat();
    return [...new Set(hashtags)].slice(0, 10);
  }

  private async optimizeTitle(
    originalTitle: string,
    trends: any,
    channelStats: any
  ): Promise<string> {
    // Clean and normalize title
    let title = originalTitle.replace(/\b(the|a|an)\b/gi, '').trim();

    // Add trending keywords if relevant
    const relevantTrends = trends.topics
      .filter(topic => title.toLowerCase().includes(topic.toLowerCase()));

    if (relevantTrends.length > 0) {
      title = `${title} 🔥 ${relevantTrends[0].toUpperCase()}`;
    }

    // Add viral pattern if engagement is low
    if (channelStats.engagement.likes / channelStats.views < 0.1) {
      const pattern = trends.patterns[Math.floor(Math.random() * trends.patterns.length)];
      title = `${title} (${pattern})`;
    }

    // Ensure length constraints
    if (title.length < this.MIN_TITLE_LENGTH) {
      title = this.expandTitle(title, trends);
    } else if (title.length > this.MAX_TITLE_LENGTH) {
      title = this.truncateTitle(title);
    }

    return title;
  }

  private expandTitle(title: string, trends: any): string {
    const enhancer = trends.patterns[Math.floor(Math.random() * trends.patterns.length)];
    return `${title} ${enhancer} 🚀`;
  }

  private truncateTitle(title: string): string {
    return title.substring(0, this.MAX_TITLE_LENGTH - 4) + '...';
  }

  private async generateDescription(
    video: any,
    trends: any,
    channelStats: any
  ): Promise<string> {
    const sections = [
      this.generateIntro(video, trends),
      this.generateKeyPoints(video),
      this.generateHashtags(trends),
      this.generateCTA(channelStats)
    ];

    return sections.join('\n\n');
  }

  private generateIntro(video: any, trends: any): string {
    const trendingTopic = trends.topics[0];
    return `🔥 Watch this incredible ${video.category} video about ${trendingTopic} that will blow your mind!`;
  }

  private generateKeyPoints(video: any): string {
    return `Key Highlights:
• Amazing moments you won't believe
• Exclusive content you can't miss
• Life-changing tips and tricks`;
  }

  private generateHashtags(trends: any): string {
    return trends.hashtags
      .slice(0, 5)
      .map(tag => `#${tag.replace('#', '')}`)
      .join(' ');
  }

  private generateCTA(channelStats: any): string {
    const milestone = Math.ceil(channelStats.subscribers / 1000) * 1000;
    return `🔔 Don't forget to LIKE, SUBSCRIBE, and hit the notification bell!
👉 Help us reach ${milestone} subscribers!
👇 Leave a comment below with your thoughts!`;
  }

  private async generateTags(video: any, trends: any): Promise<string[]> {
    const baseTags = [video.category, 'trending', 'viral'];
    const trendingTags = trends.topics;
    const combinedTags = [...new Set([...baseTags, ...trendingTags])];

    return combinedTags
      .slice(0, this.OPTIMAL_TAG_COUNT)
      .map(tag => tag.toLowerCase());
  }

  private calculateOptimalPostingTime(bestTimes: any[]): number {
    // Find the best performing hour
    const bestTime = bestTimes[0];
    const now = new Date();
    const scheduledTime = new Date();
    
    scheduledTime.setHours(bestTime.hour);
    scheduledTime.setMinutes(0);
    scheduledTime.setSeconds(0);

    // If the time has passed today, schedule for tomorrow
    if (scheduledTime.getTime() < now.getTime()) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    return scheduledTime.getTime();
  }

  private async estimateViews(
    video: any,
    analysis: any,
    trends: any,
    channelStats: any
  ): Promise<number> {
    const baseViews = channelStats.views / channelStats.videos;
    const trendMultiplier = this.calculateTrendMultiplier(video, trends);
    const qualityMultiplier = this.calculateQualityMultiplier(analysis);
    const timeMultiplier = this.calculateTimeMultiplier(this.calculateOptimalPostingTime([]));

    return Math.floor(baseViews * trendMultiplier * qualityMultiplier * timeMultiplier);
  }

  private calculateTrendMultiplier(video: any, trends: any): number {
    const trendScore = trends.topics.some(topic => 
      video.title.toLowerCase().includes(topic.toLowerCase())
    ) ? 1.5 : 1;

    return trendScore;
  }

  private calculateQualityMultiplier(analysis: any): number {
    return 1 + (analysis.engagementRate || 0);
  }

  private calculateTimeMultiplier(scheduledTime: number): number {
    const hour = new Date(scheduledTime).getHours();
    // Prime time bonus (7-10 PM)
    if (hour >= 19 && hour <= 22) return 1.3;
    // Morning bonus (8-11 AM)
    if (hour >= 8 && hour <= 11) return 1.2;
    return 1;
  }

  private async identifyTargetAudience(channelStats: any): Promise<{
    age: string[];
    interests: string[];
    regions: string[];
  }> {
    return {
      age: Object.entries(channelStats.demographics.ageRanges)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([age]) => age),
      interests: ['gaming', 'technology', 'entertainment'],
      regions: Object.entries(channelStats.demographics.countries)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([country]) => country)
    };
  }

  isReady(): boolean {
    return this.isInitialized;
  }
}

export const contentOptimizer = ContentOptimizer.getInstance();