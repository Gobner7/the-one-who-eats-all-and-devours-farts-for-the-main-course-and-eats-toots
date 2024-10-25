class RateLimiter {
  private requestCount: Map<string, number> = new Map();
  private lastReset: Map<string, number> = new Map();
  private readonly limits: Map<string, { max: number; window: number }> = new Map();

  constructor() {
    this.setupDefaultLimits();
  }

  private setupDefaultLimits() {
    // Default rate limits for different services
    this.limits.set('ebay', { max: 100, window: 60000 }); // 100 requests per minute
    this.limits.set('tcgplayer', { max: 120, window: 60000 }); // 120 requests per minute
    this.limits.set('cardmarket', { max: 60, window: 60000 }); // 60 requests per minute
    this.limits.set('mtg_graphql', { max: 1000, window: 3600000 }); // 1000 requests per hour
  }

  async throttle(service: string): Promise<void> {
    const limit = this.limits.get(service);
    if (!limit) {
      throw new Error(`No rate limit defined for service: ${service}`);
    }

    const now = Date.now();
    const lastReset = this.lastReset.get(service) || 0;
    const requestCount = this.requestCount.get(service) || 0;

    // Reset counter if window has passed
    if (now - lastReset >= limit.window) {
      this.requestCount.set(service, 0);
      this.lastReset.set(service, now);
      return;
    }

    // Check if limit exceeded
    if (requestCount >= limit.max) {
      const waitTime = limit.window - (now - lastReset);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.requestCount.set(service, 0);
      this.lastReset.set(service, now);
      return;
    }

    // Increment counter
    this.requestCount.set(service, requestCount + 1);
  }

  getRemainingRequests(service: string): number {
    const limit = this.limits.get(service);
    if (!limit) return 0;

    const count = this.requestCount.get(service) || 0;
    return Math.max(0, limit.max - count);
  }

  getResetTime(service: string): number {
    const lastReset = this.lastReset.get(service) || 0;
    const limit = this.limits.get(service);
    if (!limit) return 0;

    return Math.max(0, limit.window - (Date.now() - lastReset));
  }
}

export const rateLimiter = new RateLimiter();