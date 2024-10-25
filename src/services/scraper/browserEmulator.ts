import { EventEmitter } from '../eventEmitter';

interface BrowserProfile {
  userAgent: string;
  viewport: {
    width: number;
    height: number;
  };
  platform: string;
  language: string;
  plugins: string[];
  webGL: {
    vendor: string;
    renderer: string;
  };
  canvas: string;
  audioContext: string;
}

class BrowserEmulator extends EventEmitter {
  private readonly PROFILES: BrowserProfile[] = [
    {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      platform: 'Win32',
      language: 'en-US',
      plugins: [
        'Chrome PDF Plugin',
        'Chrome PDF Viewer',
        'Native Client'
      ],
      webGL: {
        vendor: 'Google Inc. (NVIDIA)',
        renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3080 Direct3D11 vs_5_0 ps_5_0)'
      },
      canvas: 'canvas_fingerprint',
      audioContext: 'audio_fingerprint'
    },
    {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1440, height: 900 },
      platform: 'MacIntel',
      language: 'en-US',
      plugins: [
        'Chrome PDF Plugin',
        'Chrome PDF Viewer',
        'Native Client'
      ],
      webGL: {
        vendor: 'Apple Inc.',
        renderer: 'Apple M1'
      },
      canvas: 'canvas_fingerprint_mac',
      audioContext: 'audio_fingerprint_mac'
    }
  ];

  private currentProfile: BrowserProfile | null = null;

  async launch() {
    this.currentProfile = this.getRandomProfile();
    
    const page = {
      setUserAgent: async (ua: string) => {},
      setViewport: async (viewport: { width: number; height: number }) => {},
      evaluateOnNewDocument: async (fn: Function) => {},
      setExtraHTTPHeaders: async (headers: Record<string, string>) => {},
      goto: async (url: string) => {},
      waitForSelector: async (selector: string) => {},
      evaluate: async (fn: Function) => {},
      click: async (selector: string) => {},
      type: async (selector: string, text: string) => {},
      waitForTimeout: async (ms: number) => {
        await new Promise(resolve => setTimeout(resolve, ms));
      },
      screenshot: async () => Buffer.from(''),
      close: async () => {}
    };

    // Inject browser fingerprinting evasion
    await this.injectEvasions(page);

    return {
      newPage: async () => page,
      close: async () => {}
    };
  }

  private async injectEvasions(page: any) {
    if (!this.currentProfile) return;

    // Override navigator properties
    await page.evaluateOnNewDocument((profile: BrowserProfile) => {
      Object.defineProperty(navigator, 'platform', { get: () => profile.platform });
      Object.defineProperty(navigator, 'language', { get: () => profile.language });
      Object.defineProperty(navigator, 'languages', { get: () => [profile.language, 'en'] });
      Object.defineProperty(navigator, 'plugins', { get: () => [] });
    }, this.currentProfile);

    // Override WebGL
    await page.evaluateOnNewDocument((profile: BrowserProfile) => {
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter: number) {
        if (parameter === 37445) return profile.webGL.vendor;
        if (parameter === 37446) return profile.webGL.renderer;
        return getParameter.apply(this, [parameter]);
      };
    }, this.currentProfile);

    // Add random mouse movements
    await page.evaluateOnNewDocument(() => {
      document.addEventListener('mousemove', (e) => {
        const randomOffset = Math.random() * 2 - 1;
        e.clientX += randomOffset;
        e.clientY += randomOffset;
      }, true);
    });
  }

  private getRandomProfile(): BrowserProfile {
    return this.PROFILES[Math.floor(Math.random() * this.PROFILES.length)];
  }
}

export const browserEmulator = new BrowserEmulator();