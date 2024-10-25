import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { browserProfileGenerator } from './browser-profile';

interface TokenResponse {
  token: string;
  challenge_url: string;
  session_token: string;
}

interface ChallengeResponse {
  gameType: number;
  variant: string;
  instruction: string;
  waves: number;
  wave: number;
  imageUrl: string;
  increment?: number;
  difficulty?: number;
}

export class AdvancedFunCaptchaAPI {
  private static instance: AdvancedFunCaptchaAPI;
  private baseUrl = 'https://roblox-api.arkoselabs.com';
  private sessionTokens = new Map<string, string>();

  private constructor() {}

  static getInstance(): AdvancedFunCaptchaAPI {
    if (!AdvancedFunCaptchaAPI.instance) {
      AdvancedFunCaptchaAPI.instance = new AdvancedFunCaptchaAPI();
    }
    return AdvancedFunCaptchaAPI.instance;
  }

  async getToken(config: {
    pkey: string;
    surl?: string;
    data?: Record<string, any>;
    site: string;
    proxy?: string;
  }): Promise<TokenResponse> {
    const profile = browserProfileGenerator.getRandomProfile();
    const sessionId = uuidv4();

    try {
      const response = await axios.post(
        `${config.surl || this.baseUrl}/fc/gt2/public_key/${config.pkey}`,
        {
          bda: this.generateBrowserData(profile),
          public_key: config.pkey,
          site: config.site,
          userbrowser: profile.userAgent,
          rnd: Math.random(),
          data: config.data,
          session_token: sessionId
        },
        {
          headers: {
            'User-Agent': profile.userAgent,
            'Accept': 'application/json',
            'Accept-Language': profile.navigator.language,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          ...(config.proxy ? {
            proxy: {
              host: config.proxy.split(':')[0],
              port: parseInt(config.proxy.split(':')[1])
            }
          } : {})
        }
      );

      this.sessionTokens.set(sessionId, response.data.token);

      return {
        token: response.data.token,
        challenge_url: response.data.challenge_url,
        session_token: sessionId
      };
    } catch (error) {
      console.error('Failed to get token:', error);
      throw new Error('Failed to get FunCaptcha token');
    }
  }

  async getChallenge(sessionToken: string): Promise<ChallengeResponse> {
    const token = this.sessionTokens.get(sessionToken);
    if (!token) {
      throw new Error('Invalid session token');
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/fc/gfct/`,
        {
          token,
          session_token: sessionToken,
          analytics_tier: 40,
          render_type: 'canvas'
        },
        {
          headers: {
            'User-Agent': browserProfileGenerator.getRandomProfile().userAgent
          }
        }
      );

      const gameData = response.data.game_data;
      return {
        gameType: gameData.game_type,
        variant: gameData.game_variant,
        instruction: gameData.instruction,
        waves: gameData.waves,
        wave: gameData.wave,
        imageUrl: gameData.image_url,
        increment: gameData.angle_increment,
        difficulty: gameData.difficulty
      };
    } catch (error) {
      console.error('Failed to get challenge:', error);
      throw new Error('Failed to get FunCaptcha challenge');
    }
  }

  async submitAnswer(
    sessionToken: string,
    answer: number | string,
    challengeData: ChallengeResponse
  ): Promise<boolean> {
    const token = this.sessionTokens.get(sessionToken);
    if (!token) {
      throw new Error('Invalid session token');
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/fc/ca/`,
        {
          token,
          session_token: sessionToken,
          answer,
          game_type: challengeData.gameType,
          wave: challengeData.wave
        },
        {
          headers: {
            'User-Agent': browserProfileGenerator.getRandomProfile().userAgent
          }
        }
      );

      return response.data.response === 'correct';
    } catch (error) {
      console.error('Failed to submit answer:', error);
      throw new Error('Failed to submit FunCaptcha answer');
    }
  }

  private generateBrowserData(profile: any): string {
    const data = {
      userAgent: profile.userAgent,
      language: profile.navigator.language,
      screenResolution: `${profile.screen.width}x${profile.screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      webglRenderer: profile.webgl,
      hasTouch: 'ontouchstart' in window,
      timestamp: Date.now()
    };

    return btoa(JSON.stringify(data));
  }
}

export const advancedFunCaptchaAPI = AdvancedFunCaptchaAPI.getInstance();