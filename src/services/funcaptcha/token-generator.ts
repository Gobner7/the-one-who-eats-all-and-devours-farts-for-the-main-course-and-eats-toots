import { browserProfileGenerator } from './browser-profile';
import { EventEmitter } from './event-emitter';
import { proxyManager } from '../proxy';
import { networkClient } from './network-client';
import { tokenPool } from './token-pool';

interface TokenConfig {
  publicKey: string;
  siteUrl: string;
  baseUrl: string;
  userAgent: string;
  headers?: Record<string, string>;
}

interface TokenResponse {
  token: string;
  expires: number;
}

export class TokenGenerator extends EventEmitter {
  private static instance: TokenGenerator;
  private tokenCache: Map<string, TokenResponse> = new Map();
  private readonly TOKEN_EXPIRY = 120000;
  private readonly MAX_RETRIES = 5;
  private readonly INITIAL_RETRY_DELAY = 1000;
  private readonly MAX_RETRY_DELAY = 10000;

  private constructor() {
    super();
    this.setupCleanupInterval();
  }

  static getInstance(): TokenGenerator {
    if (!TokenGenerator.instance) {
      TokenGenerator.instance = new TokenGenerator();
    }
    return TokenGenerator.instance;
  }

  private setupCleanupInterval() {
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.tokenCache.entries()) {
        if (now >= value.expires) {
          this.tokenCache.delete(key);
        }
      }
    }, 60000);
  }

  async generate(config: TokenConfig): Promise<string> {
    const cacheKey = `${config.publicKey}:${config.siteUrl}`;
    const cached = this.tokenCache.get(cacheKey);

    if (cached && Date.now() < cached.expires) {
      return cached.token;
    }

    let attempts = 0;
    let lastError: Error | null = null;

    while (attempts < this.MAX_RETRIES) {
      try {
        // Try to get a token from the pool first
        const token = await tokenPool.getToken();
        
        const tokenResponse: TokenResponse = {
          token,
          expires: Date.now() + this.TOKEN_EXPIRY
        };

        this.tokenCache.set(cacheKey, tokenResponse);
        
        this.emit('tokenGenerated', {
          timestamp: Date.now(),
          site: config.siteUrl,
          publicKey: config.publicKey
        });

        return token;
      } catch (error) {
        attempts++;
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempts === this.MAX_RETRIES) {
          throw new Error(`Token generation failed: ${lastError.message}`);
        }

        const delay = Math.min(
          this.INITIAL_RETRY_DELAY * Math.pow(2, attempts),
          this.MAX_RETRY_DELAY
        );

        if (proxyManager.isProxyEnabled()) {
          await proxyManager.rotateProxy();
        }

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error('Token generation failed');
  }
}

export const tokenGenerator = TokenGenerator.getInstance();