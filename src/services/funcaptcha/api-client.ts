import { browserProfileGenerator } from './browser-profile';
import { EventEmitter } from './event-emitter';
import { tokenGenerator } from './token-generator';

const API_ENDPOINTS = {
  ROBLOX: {
    publicKey: '476068BF-9607-4799-B53D-966BE98E2B81',
    siteUrl: 'https://www.roblox.com',
    baseUrl: 'https://roblox-api.arkoselabs.com',
    apiUrls: {
      token: '/fc/gt2/public_key/{publicKey}',
      challenge: '/fc/gfct/',
      answer: '/fc/ca/',
      audio: '/fc/get_audio/',
    }
  }
};

export class ArkoseClient extends EventEmitter {
  private static instance: ArkoseClient;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 2000;

  private constructor() {
    super();
  }

  static getInstance(): ArkoseClient {
    if (!ArkoseClient.instance) {
      ArkoseClient.instance = new ArkoseClient();
    }
    return ArkoseClient.instance;
  }

  async getSessionToken(): Promise<string> {
    const profile = browserProfileGenerator.getRandomProfile();
    const config = API_ENDPOINTS.ROBLOX;

    try {
      const token = await tokenGenerator.generate({
        publicKey: config.publicKey,
        siteUrl: config.siteUrl,
        baseUrl: config.baseUrl,
        userAgent: profile.userAgent,
        headers: {
          'Origin': config.siteUrl,
          'Referer': `${config.siteUrl}/`,
          'Accept': 'application/json',
          'Accept-Language': profile.navigator.language,
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'cross-site'
        }
      });

      this.emit('tokenGenerated', {
        timestamp: Date.now(),
        site: config.siteUrl
      });

      return token;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to get Arkose session token: ${errorMessage}`);
    }
  }

  async getChallenge(token: string): Promise<any> {
    const profile = browserProfileGenerator.getRandomProfile();
    const config = API_ENDPOINTS.ROBLOX;

    const response = await fetch(`${config.baseUrl}/fc/gfct/`, {
      method: 'POST',
      headers: {
        'User-Agent': profile.userAgent,
        'Accept': 'application/json',
        'Accept-Language': profile.navigator.language,
        'Accept-Encoding': 'gzip, deflate, br',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': config.siteUrl,
        'Referer': `${config.siteUrl}/`,
        'Connection': 'keep-alive',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'cross-site'
      },
      body: new URLSearchParams({
        'session_token': token,
        'analytics_tier': '40',
        'render_type': 'canvas'
      })
    });

    if (!response.ok) {
      throw new Error(`Challenge request failed: ${response.status}`);
    }

    return response.json();
  }

  async submitAnswer(token: string, answer: string | number): Promise<boolean> {
    const profile = browserProfileGenerator.getRandomProfile();
    const config = API_ENDPOINTS.ROBLOX;

    const response = await fetch(`${config.baseUrl}/fc/ca/`, {
      method: 'POST',
      headers: {
        'User-Agent': profile.userAgent,
        'Accept': 'application/json',
        'Accept-Language': profile.navigator.language,
        'Accept-Encoding': 'gzip, deflate, br',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': config.siteUrl,
        'Referer': `${config.siteUrl}/`,
        'Connection': 'keep-alive',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'cross-site'
      },
      body: new URLSearchParams({
        'session_token': token,
        'answer': answer.toString()
      })
    });

    if (!response.ok) {
      throw new Error(`Answer submission failed: ${response.status}`);
    }

    const result = await response.json();
    return result.response === 'correct';
  }
}

export const arkoseClient = ArkoseClient.getInstance();