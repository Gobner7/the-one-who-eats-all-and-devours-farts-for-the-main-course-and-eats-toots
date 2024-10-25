import { EventEmitter } from '../eventEmitter';
import { proxyRotator } from './proxyRotator';
import { browserEmulator } from './browserEmulator';
import { captionGenerator } from '../captionGenerator';

interface ScrapedVideo {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  duration: number;
  views: number;
  likes: number;
  engagement: number;
  source: 'youtube' | 'tiktok';
  hashtags: string[];
  description: string;
  publishDate: Date;
}

class ContentScraper extends EventEmitter {
  private readonly YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
  private readonly TIKTOK_API_KEY = import.meta.env.VITE_TIKTOK_API_KEY;
  private readonly BATCH_SIZE = 50;
  private readonly DELAY_BETWEEN_REQUESTS = 1000;
  private readonly MAX_RETRIES = 3;

  private readonly USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  ];

  async scrapeYouTubeShorts(query: string, limit = 50): Promise<ScrapedVideo[]> {
    const videos: ScrapedVideo[] = [];
    let nextPageToken = '';
    let retries = 0;

    try {
      while (videos.length < limit && retries < this.MAX_RETRIES) {
        const proxy = await proxyRotator.getProxy();
        const userAgent = this.getRandomUserAgent();

        try {
          const response = await fetch(
            `https://www.googleapis.com/youtube/v3/search?` +
            `part=snippet&q=${encodeURIComponent(query)}&` +
            `maxResults=${this.BATCH_SIZE}&type=video&` +
            `videoDuration=short&key=${this.YOUTUBE_API_KEY}&` +
            `pageToken=${nextPageToken}`,
            {
              headers: {
                'User-Agent': userAgent,
                'Accept': 'application/json',
                'X-Proxy': proxy.ip,
                'X-Proxy-Authorization': proxy.username ? 
                  `Basic ${btoa(`${proxy.username}:${proxy.password}`)}` : ''
              }
            }
          );

          if (!response.ok) {
            throw new Error(`YouTube API error: ${response.statusText}`);
          }

          const data = await response.json();
          
          // Process videos in parallel
          const videoDetails = await Promise.all(
            data.items.map(item => this.getVideoDetails(item.id.videoId))
          );

          for (const details of videoDetails) {
            if (this.isValidShort(details)) {
              videos.push({
                id: details.id,
                title: details.snippet.title,
                url: `https://youtube.com/shorts/${details.id}`,
                thumbnail: details.snippet.thumbnails.high.url,
                duration: this.parseDuration(details.contentDetails.duration),
                views: parseInt(details.statistics.viewCount),
                likes: parseInt(details.statistics.likeCount),
                engagement: this.calculateEngagement(details.statistics),
                source: 'youtube',
                hashtags: this.extractHashtags(details.snippet.description),
                description: details.snippet.description,
                publishDate: new Date(details.snippet.publishedAt)
              });
            }

            if (videos.length >= limit) break;
          }

          nextPageToken = data.nextPageToken;
          if (!nextPageToken) break;

          // Report proxy success
          await proxyRotator.reportSuccess(proxy.ip);
          
          // Respect rate limits
          await this.delay(this.DELAY_BETWEEN_REQUESTS);

        } catch (error) {
          console.error('Error scraping YouTube:', error);
          await proxyRotator.reportFailure(proxy.ip);
          retries++;
          
          if (retries >= this.MAX_RETRIES) {
            throw new Error('Max retries exceeded');
          }

          await this.delay(this.DELAY_BETWEEN_REQUESTS * retries);
        }
      }

      return videos;
    } catch (error) {
      console.error('YouTube scraping error:', error);
      throw error;
    }
  }

  private async getVideoDetails(videoId: string): Promise<any> {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?` +
      `part=contentDetails,statistics,snippet&` +
      `id=${videoId}&key=${this.YOUTUBE_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`Failed to get video details: ${response.statusText}`);
    }

    const data = await response.json();
    return data.items[0];
  }

  private isValidShort(videoDetails: any): boolean {
    const duration = this.parseDuration(videoDetails.contentDetails.duration);
    return duration <= 60 && duration >= 15;
  }

  private parseDuration(duration: string): number {
    const match = duration.match(/PT(\d+M)?(\d+S)?/);
    let seconds = 0;

    if (match) {
      if (match[1]) seconds += parseInt(match[1].slice(0, -1)) * 60;
      if (match[2]) seconds += parseInt(match[2].slice(0, -1));
    }

    return seconds;
  }

  private calculateEngagement(statistics: any): number {
    const views = parseInt(statistics.viewCount);
    const likes = parseInt(statistics.likeCount);
    const comments = parseInt(statistics.commentCount);
    
    if (views === 0) return 0;
    return ((likes + comments) / views) * 100;
  }

  private extractHashtags(text: string): string[] {
    const hashtagRegex = /#[\w-]+/g;
    return (text.match(hashtagRegex) || []).map(tag => tag.slice(1));
  }

  private getRandomUserAgent(): string {
    return this.USER_AGENTS[Math.floor(Math.random() * this.USER_AGENTS.length)];
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const contentScraper = new ContentScraper();