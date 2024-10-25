import { EventEmitter } from './event-emitter';
import { browserProfileGenerator } from './browser-profile';

interface BrowserEnvironment {
  userAgent: string;
  language: string;
  platform: string;
  vendor: string;
  hardwareConcurrency: number;
  deviceMemory: number;
  screenResolution: string;
  colorDepth: number;
  timezone: string;
  plugins: string[];
  fonts: string[];
}

export class BrowserEmulator extends EventEmitter {
  private static instance: BrowserEmulator;
  private currentEnvironment: BrowserEnvironment | null = null;
  private readonly HEADERS = {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin'
  };

  private constructor() {
    super();
  }

  static getInstance(): BrowserEmulator {
    if (!BrowserEmulator.instance) {
      BrowserEmulator.instance = new BrowserEmulator();
    }
    return BrowserEmulator.instance;
  }

  async initialize(): Promise<void> {
    await this.setupEnvironment();
  }

  async setupEnvironment(): Promise<void> {
    const profile = browserProfileGenerator.getRandomProfile();
    
    this.currentEnvironment = {
      userAgent: profile.userAgent,
      language: profile.navigator.language,
      platform: profile.navigator.platform,
      vendor: 'Google Inc.',
      hardwareConcurrency: profile.navigator.hardwareConcurrency,
      deviceMemory: profile.navigator.deviceMemory,
      screenResolution: `${profile.screen.width}x${profile.screen.height}`,
      colorDepth: profile.screen.colorDepth,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      plugins: profile.plugins,
      fonts: profile.fonts
    };

    this.emit('environmentUpdated', this.currentEnvironment);
  }

  getEnvironment(): {
    getData: () => any;
    getHeaders: () => Record<string, string>;
  } {
    const env = this.currentEnvironment;
    if (!env) throw new Error('Environment not initialized');

    const [width, height] = env.screenResolution.split('x').map(Number);
    const timestamp = Date.now();
    const loadStart = timestamp - Math.floor(Math.random() * 1000 + 500);

    return {
      getData: () => ({
        // Browser data
        userAgent: env.userAgent,
        language: env.language,
        languages: [env.language, 'en'],
        platform: env.platform,
        vendor: env.vendor,
        hardwareConcurrency: env.hardwareConcurrency,
        deviceMemory: env.deviceMemory,
        
        // Screen properties
        screen: {
          width,
          height,
          availWidth: width,
          availHeight: height,
          colorDepth: env.colorDepth,
          pixelDepth: env.colorDepth,
          orientation: {
            type: width > height ? 'landscape-primary' : 'portrait-primary',
            angle: 0
          }
        },

        // Window properties
        window: {
          innerWidth: width,
          innerHeight: height,
          outerWidth: width,
          outerHeight: height,
          screenX: 0,
          screenY: 0,
          pageXOffset: 0,
          pageYOffset: 0,
          devicePixelRatio: 1
        },

        // Feature detection
        features: {
          touch: false,
          webgl: true,
          webgl2: true,
          canvas: true,
          audio: true,
          video: true,
          webrtc: false
        },

        // Performance data
        timing: {
          navigationStart: loadStart,
          fetchStart: loadStart + 20,
          domainLookupStart: loadStart + 30,
          domainLookupEnd: loadStart + 60,
          connectStart: loadStart + 80,
          connectEnd: loadStart + 100,
          requestStart: loadStart + 120,
          responseStart: loadStart + 200,
          responseEnd: loadStart + 300,
          domLoading: loadStart + 320,
          domInteractive: loadStart + 400,
          domContentLoadedEventStart: loadStart + 450,
          domContentLoadedEventEnd: loadStart + 460,
          domComplete: loadStart + 500,
          loadEventStart: loadStart + 510,
          loadEventEnd: timestamp
        },

        // Additional data
        plugins: env.plugins,
        fonts: env.fonts,
        timezone: env.timezone,
        timestamp
      }),
      
      getHeaders: () => ({
        ...this.HEADERS,
        'User-Agent': env.userAgent,
        'Accept-Language': env.language
      })
    };
  }

  async rotateEnvironment(): Promise<void> {
    await this.setupEnvironment();
  }
}

export const browserEmulator = BrowserEmulator.getInstance();