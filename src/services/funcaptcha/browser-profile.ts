import { v4 as uuidv4 } from 'uuid';

interface BrowserProfile {
  id: string;
  userAgent: string;
  browser: {
    name: string;
    version: string;
    major: string;
  };
  screen: {
    width: number;
    height: number;
    colorDepth: number;
    pixelRatio: number;
  };
  navigator: {
    language: string;
    languages: string[];
    platform: string;
    hardwareConcurrency: number;
    deviceMemory: number;
  };
  plugins: string[];
  fonts: string[];
  canvas: string;
  webgl: string;
  audio: string;
}

export class BrowserProfileGenerator {
  private static instance: BrowserProfileGenerator;
  private profiles: Map<string, BrowserProfile>;
  private readonly CHROME_VERSIONS = ['120.0.0.0', '119.0.0.0', '118.0.0.0'];
  private readonly SCREEN_RESOLUTIONS = [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
    { width: 1536, height: 864 }
  ];

  private constructor() {
    this.profiles = new Map();
    this.generateProfiles();
  }

  static getInstance(): BrowserProfileGenerator {
    if (!BrowserProfileGenerator.instance) {
      BrowserProfileGenerator.instance = new BrowserProfileGenerator();
    }
    return BrowserProfileGenerator.instance;
  }

  private generateProfiles() {
    const chromeProfiles = this.generateChromeProfiles();
    chromeProfiles.forEach(profile => {
      this.profiles.set(profile.id, profile);
    });
  }

  private generateChromeProfiles(): BrowserProfile[] {
    return this.CHROME_VERSIONS.flatMap(version => {
      return this.SCREEN_RESOLUTIONS.map(resolution => {
        const id = uuidv4();
        const platform = 'Win32';
        const language = 'en-US';

        return {
          id,
          userAgent: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version} Safari/537.36`,
          browser: {
            name: 'Chrome',
            version,
            major: version.split('.')[0]
          },
          screen: {
            width: resolution.width,
            height: resolution.height,
            colorDepth: 24,
            pixelRatio: 1
          },
          navigator: {
            language,
            languages: [language, 'en'],
            platform,
            hardwareConcurrency: 8,
            deviceMemory: 8
          },
          plugins: [
            'Chrome PDF Plugin',
            'Chrome PDF Viewer',
            'Native Client'
          ],
          fonts: [
            'Arial',
            'Helvetica',
            'Times New Roman',
            'Segoe UI',
            'Roboto',
            'Tahoma',
            'Verdana'
          ],
          canvas: this.generateCanvasFingerprint(id),
          webgl: this.generateWebGLFingerprint(),
          audio: this.generateAudioFingerprint()
        };
      });
    });
  }

  private generateCanvasFingerprint(id: string): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    canvas.width = 240;
    canvas.height = 60;
    
    // Background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Text
    ctx.fillStyle = '#1a73e8';
    ctx.font = '16px Arial';
    ctx.fillText('Roblox FunCaptcha', 10, 30);
    
    // Random shapes
    ctx.beginPath();
    ctx.arc(200, 30, 20, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${Math.random() * 255},${Math.random() * 255},${Math.random() * 255},0.2)`;
    ctx.fill();
    
    return canvas.toDataURL();
  }

  private generateWebGLFingerprint(): string {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl')!;
    
    if (!gl) return '';

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return '';

    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    
    return `${vendor} ${renderer}`;
  }

  private generateAudioFingerprint(): string {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const analyser = audioContext.createAnalyser();
      
      oscillator.connect(analyser);
      analyser.fftSize = 2048;
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);
      
      return Array.from(dataArray)
        .slice(0, 20)
        .map(v => v.toString(16).padStart(2, '0'))
        .join('');
    } catch {
      return '';
    }
  }

  getRandomProfile(): BrowserProfile {
    const profiles = Array.from(this.profiles.values());
    return profiles[Math.floor(Math.random() * profiles.length)];
  }

  getProfile(id: string): BrowserProfile | undefined {
    return this.profiles.get(id);
  }

  refreshProfiles(): void {
    this.profiles.clear();
    this.generateProfiles();
  }
}

export const browserProfileGenerator = BrowserProfileGenerator.getInstance();