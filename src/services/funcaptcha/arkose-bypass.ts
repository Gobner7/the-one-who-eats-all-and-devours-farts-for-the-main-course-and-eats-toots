import { EventEmitter } from './event-emitter';
import { browserProfileGenerator } from './browser-profile';
import { networkClient } from './network-client';

export class ArkoseBypass extends EventEmitter {
  private static instance: ArkoseBypass;
  private readonly ROBLOX_KEY = '476068BF-9607-4799-B53D-966BE98E2B81';
  private readonly ROBLOX_URL = 'https://www.roblox.com';
  private readonly API_BASE = 'https://roblox-api.arkoselabs.com';
  private isInitialized = false;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000;

  private constructor() {
    super();
  }

  static getInstance(): ArkoseBypass {
    if (!ArkoseBypass.instance) {
      ArkoseBypass.instance = new ArkoseBypass();
    }
    return ArkoseBypass.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Test connection with basic request
      await this.testConnection();
      
      // Initialize browser environment
      const profile = browserProfileGenerator.getRandomProfile();
      await this.setupBrowserEnvironment(profile);

      // Verify initialization with test session
      const testSession = await this.createBasicSession();
      if (!testSession.token) {
        throw new Error('Failed to generate test token');
      }

      this.isInitialized = true;
      this.emit('initialized');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to initialize ArkoseBypass: ${errorMessage}`);
    }
  }

  private async testConnection(): Promise<void> {
    try {
      await networkClient.request({
        method: 'HEAD',
        url: this.API_BASE,
        timeout: 5000
      });
    } catch (error) {
      throw new Error('Failed to connect to Arkose API');
    }
  }

  private async setupBrowserEnvironment(profile: any): Promise<void> {
    const env = {
      userAgent: profile.userAgent,
      language: profile.navigator.language,
      platform: profile.navigator.platform,
      screen: profile.screen,
      plugins: profile.plugins,
      canvas: profile.canvas,
      webgl: profile.webgl,
      audio: profile.audio
    };

    if (!env.userAgent.includes('Chrome/')) {
      throw new Error('Invalid browser profile');
    }

    this.emit('environmentSetup', env);
  }

  private async createBasicSession() {
    const profile = browserProfileGenerator.getRandomProfile();
    const timestamp = Date.now();

    try {
      const response = await networkClient.post(
        `${this.API_BASE}/fc/gt2/public_key/${this.ROBLOX_KEY}`,
        {
          bda: this.generateBasicBrowserData(profile, timestamp),
          public_key: this.ROBLOX_KEY,
          site: this.ROBLOX_URL,
          userbrowser: profile.userAgent,
          rnd: Math.random()
        },
        {
          headers: {
            'User-Agent': profile.userAgent,
            'Accept': 'application/json',
            'Accept-Language': profile.navigator.language
          }
        }
      );

      return {
        token: response.token,
        profile,
        timestamp
      };
    } catch (error) {
      throw new Error('Failed to create basic session');
    }
  }

  async createSession(): Promise<{ token: string; sessionId: string }> {
    if (!this.isInitialized) {
      throw new Error('ArkoseBypass not initialized');
    }

    let attempts = 0;
    let lastError: Error | null = null;

    while (attempts < this.MAX_RETRIES) {
      try {
        const profile = browserProfileGenerator.getRandomProfile();
        const timestamp = Date.now();
        const sessionId = crypto.randomUUID();

        const response = await networkClient.post(
          `${this.API_BASE}/fc/gt2/public_key/${this.ROBLOX_KEY}`,
          {
            bda: this.generateEnhancedBrowserData(profile, timestamp),
            public_key: this.ROBLOX_KEY,
            site: this.ROBLOX_URL,
            userbrowser: profile.userAgent,
            rnd: Math.random(),
            data: {
              mode: 'auth-login',
              type: 'login',
              timestamp,
              webDriver: null,
              deviceData: this.generateDeviceData(profile)
            }
          },
          {
            headers: this.generateHeaders(profile)
          }
        );

        if (!response.token) {
          throw new Error('No token in response');
        }

        return {
          token: response.token,
          sessionId
        };
      } catch (error) {
        attempts++;
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempts === this.MAX_RETRIES) {
          throw lastError;
        }

        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * Math.pow(2, attempts)));
      }
    }

    throw lastError || new Error('Failed to create session');
  }

  private generateBasicBrowserData(profile: any, timestamp: number): string {
    const data = {
      userAgent: profile.userAgent,
      language: profile.navigator.language,
      platform: profile.navigator.platform,
      timestamp
    };

    return btoa(JSON.stringify(data));
  }

  private generateEnhancedBrowserData(profile: any, timestamp: number): string {
    const data = {
      userAgent: profile.userAgent,
      language: profile.navigator.language,
      platform: profile.navigator.platform,
      screenResolution: [profile.screen.width, profile.screen.height],
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timestamp,
      canvas: profile.canvas,
      webgl: profile.webgl,
      audio: profile.audio,
      plugins: profile.plugins,
      fonts: profile.fonts
    };

    return btoa(JSON.stringify(data));
  }

  private generateDeviceData(profile: any): string {
    const data = {
      deviceId: crypto.randomUUID(),
      browserType: 'Chrome',
      browserVersion: profile.browser.version,
      os: profile.navigator.platform,
      screen: {
        width: profile.screen.width,
        height: profile.screen.height,
        density: profile.screen.pixelRatio
      },
      capabilities: {
        audio: true,
        canvas: true,
        webgl: true,
        webgl2: true,
        webAssembly: true,
        workers: true
      }
    };

    return btoa(JSON.stringify(data));
  }

  private generateHeaders(profile: any): Record<string, string> {
    return {
      'User-Agent': profile.userAgent,
      'Accept': 'application/json',
      'Accept-Language': profile.navigator.language,
      'Accept-Encoding': 'gzip, deflate, br',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Origin': this.ROBLOX_URL,
      'Referer': `${this.ROBLOX_URL}/login`,
      'Connection': 'keep-alive',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'cross-site'
    };
  }

  isReady(): boolean {
    return this.isInitialized;
  }
}

export const arkoseBypass = ArkoseBypass.getInstance();