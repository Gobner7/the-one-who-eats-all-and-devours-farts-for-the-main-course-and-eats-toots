import { EventEmitter } from './event-emitter';
import { networkClient } from './network-client';
import { browserProfileGenerator } from './browser-profile';
import { arkoseBypass } from './arkose-bypass';

interface TokenEntry {
  token: string;
  expires: number;
  source: string;
}

export class TokenPool extends EventEmitter {
  private static instance: TokenPool;
  private tokens: TokenEntry[] = [];
  private isGenerating = false;
  private isInitialized = false;
  private readonly MIN_POOL_SIZE = 5;
  private readonly MAX_POOL_SIZE = 20;
  private readonly TOKEN_EXPIRY = 120000; // 2 minutes
  private readonly GENERATION_INTERVAL = 10000; // 10 seconds
  private readonly MAX_INIT_RETRIES = 3;
  private readonly RETRY_DELAY = 2000;

  private constructor() {
    super();
  }

  static getInstance(): TokenPool {
    if (!TokenPool.instance) {
      TokenPool.instance = new TokenPool();
    }
    return TokenPool.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    let retries = 0;
    while (retries < this.MAX_INIT_RETRIES) {
      try {
        // Initialize with fallback mechanism
        await this.initializeWithFallback();
        
        // Start pool maintenance
        this.startPoolMaintenance();
        
        this.isInitialized = true;
        this.emit('initialized');
        return;
      } catch (error) {
        retries++;
        console.error(`TokenPool initialization attempt ${retries} failed:`, error);

        if (retries === this.MAX_INIT_RETRIES) {
          throw new Error(`Failed to initialize token pool after ${this.MAX_INIT_RETRIES} attempts`);
        }

        // Wait before retrying with exponential backoff
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * Math.pow(2, retries)));
      }
    }
  }

  private async initializeWithFallback() {
    try {
      // Try primary initialization
      await this.generateInitialTokens();
    } catch (error) {
      console.warn('Primary initialization failed, attempting fallback:', error);
      
      // Fallback to basic initialization
      await this.generateFallbackToken();
    }

    if (this.tokens.length === 0) {
      throw new Error('Failed to initialize tokens through all methods');
    }
  }

  private async generateInitialTokens(): Promise<void> {
    try {
      // Generate initial set of tokens
      const initialTokenCount = Math.min(this.MIN_POOL_SIZE, this.MAX_POOL_SIZE);
      
      const tokenPromises = Array(initialTokenCount).fill(0).map(() => 
        this.generateToken()
      );

      const tokens = await Promise.allSettled(tokenPromises);
      
      // Filter successful tokens
      const successfulTokens = tokens
        .filter((result): result is PromiseFulfilledResult<TokenEntry> => 
          result.status === 'fulfilled'
        )
        .map(result => result.value);

      this.tokens.push(...successfulTokens);

      if (this.tokens.length === 0) {
        throw new Error('No tokens generated successfully');
      }
    } catch (error) {
      throw new Error(`Failed to generate initial tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async generateFallbackToken(): Promise<void> {
    try {
      const profile = browserProfileGenerator.getRandomProfile();
      const token = await this.generateBasicToken(profile);
      
      this.tokens.push({
        token,
        expires: Date.now() + this.TOKEN_EXPIRY,
        source: 'fallback'
      });
    } catch (error) {
      throw new Error(`Fallback token generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async generateBasicToken(profile: any): Promise<string> {
    const response = await networkClient.request({
      method: 'GET',
      url: 'https://roblox-api.arkoselabs.com/fc/gt2/public_key/476068BF-9607-4799-B53D-966BE98E2B81',
      headers: {
        'User-Agent': profile.userAgent,
        'Accept': 'application/json'
      }
    });

    if (!response.token) {
      throw new Error('No token in response');
    }

    return response.token;
  }

  private startPoolMaintenance() {
    setInterval(() => {
      this.cleanExpiredTokens();
      if (this.tokens.length < this.MIN_POOL_SIZE && !this.isGenerating) {
        this.generateTokens().catch(error => {
          console.error('Failed to generate tokens during maintenance:', error);
        });
      }
    }, this.GENERATION_INTERVAL);
  }

  private cleanExpiredTokens() {
    const now = Date.now();
    this.tokens = this.tokens.filter(token => token.expires > now);
  }

  private async generateToken(): Promise<TokenEntry> {
    const session = await arkoseBypass.createSession();
    return {
      token: session.token,
      expires: Date.now() + this.TOKEN_EXPIRY,
      source: 'arkose'
    };
  }

  private async generateTokens() {
    if (this.isGenerating) {
      return;
    }

    this.isGenerating = true;

    try {
      const token = await this.generateToken();
      this.tokens.push(token);
      
      this.emit('tokenGenerated', {
        timestamp: Date.now(),
        source: token.source
      });
    } catch (error) {
      console.error('Token generation failed:', error);
    } finally {
      this.isGenerating = false;
    }
  }

  async getToken(): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    this.cleanExpiredTokens();

    if (this.tokens.length === 0) {
      await this.generateTokens();
    }

    const token = this.tokens.shift();
    if (!token) {
      throw new Error('No tokens available');
    }

    if (this.tokens.length < this.MIN_POOL_SIZE) {
      this.generateTokens().catch(console.error);
    }

    return token.token;
  }

  getPoolSize(): number {
    return this.tokens.length;
  }

  isReady(): boolean {
    return this.isInitialized;
  }
}

export const tokenPool = TokenPool.getInstance();