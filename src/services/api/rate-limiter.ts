import { EventEmitter } from '../eventEmitter';

interface RateLimitConfig {
  maxRequests: number;
  interval: number; // in milliseconds
}

class RateLimiter extends EventEmitter {
  private requestCount: Map<string, number> = new Map();
  private lastReset: Map<string, number> = new Map();
  private config: Map<string, RateLimitConfig> = new Map();

  constructor() {
    super();
    this.setupDefaultLimits();
  }

  private setupDefaultLimits() {
    this.config.set('mtg_graphql', {
      maxRequests: 1000,
      interval: 60 * 60 * 1000 // 1 hour
    });
    this.config.set('ebay', {
      maxRequests: 100,
      interval: 60 * 1000 // 1 minute
    });
  }

  async throttle(service: string): Promise<void> {
    const config = this.config.get(service);
    if (!config) {
      throw new Error(`No rate limit config for service: ${service}`);
    }

    const now = Date.now();
    const lastReset = this.lastReset.get(service) || 0;
    const requestCount = this.requestCount.get(service) || 0;

    // Reset counter if interval has passed
    if (now - lastReset >= config.interval) {
      this.requestCount.set(service, 0);
      this.lastReset.set(service, now);
      return;
    }

    // Check if limit exceeded
    if (requestCount >= config.maxRequests) {
      const waitTime = config.interval - (now - lastReset);
      this.emit('limitExceeded', { service, waitTime });
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.requestCount.set(service, 0);
      this.lastReset.set(service, now);
      return;
    }

    // Increment counter
    this.requestCount.set(service, requestCount + 1);
  }

  getRemainingRequests(service: string): number {
    const config = this.config.get(service);
    if (!config) return 0;

    const requestCount = this.requestCount.get(service) || 0;
    return Math.max(0, config.maxRequests - requestCount);
  }

  getResetTime(service: string): number {
    const lastReset = this.lastReset.get(service) || 0;
    const config = this.config.get(service);
    if (!config) return 0;

    return Math.max(0, config.interval - (Date.now() - lastReset));
  }
}

export const rateLimiter = new RateLimiter();