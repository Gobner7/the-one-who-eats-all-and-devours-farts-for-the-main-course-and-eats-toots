import { EventEmitter } from '../funcaptcha/event-emitter';
import { browserProfileGenerator } from '../funcaptcha/browser-profile';
import { networkClient } from '../funcaptcha/network-client';
import { proxyManager } from '../proxy';

interface AuthResult {
  success: boolean;
  error?: string;
  userId?: string;
  robuxBalance?: number;
}

export class RobloxAuth extends EventEmitter {
  private static instance: RobloxAuth;
  private readonly LOGIN_URL = 'https://auth.roblox.com/v2/login';
  private readonly SIGNUP_URL = 'https://auth.roblox.com/v2/signup';
  private readonly CSRF_URL = 'https://auth.roblox.com/v2/metadata';
  private readonly MAX_RETRIES = 3;

  private constructor() {
    super();
  }

  static getInstance(): RobloxAuth {
    if (!RobloxAuth.instance) {
      RobloxAuth.instance = new RobloxAuth();
    }
    return RobloxAuth.instance;
  }

  async getCsrfToken(): Promise<string> {
    const response = await networkClient.request({
      method: 'GET',
      url: this.CSRF_URL,
      headers: {
        'User-Agent': browserProfileGenerator.getRandomProfile().userAgent
      }
    });

    const token = response.headers?.['x-csrf-token'];
    if (!token) {
      throw new Error('Failed to obtain CSRF token');
    }

    return token;
  }

  async login(username: string, password: string, captchaToken: string): Promise<AuthResult> {
    const profile = browserProfileGenerator.getRandomProfile();
    const csrfToken = await this.getCsrfToken();

    try {
      const response = await networkClient.request({
        method: 'POST',
        url: this.LOGIN_URL,
        headers: {
          'User-Agent': profile.userAgent,
          'X-CSRF-TOKEN': csrfToken,
          'Content-Type': 'application/json',
          'Roblox-Challenge-Type': 'captcha',
          'Roblox-Challenge-Token': captchaToken
        },
        data: {
          ctype: 'Username',
          cvalue: username,
          password: password
        }
      });

      if (response.errors) {
        throw new Error(response.errors[0]?.message || 'Login failed');
      }

      const cookies = response.headers?.['set-cookie'];
      if (!cookies?.some(c => c.includes('.ROBLOSECURITY='))) {
        throw new Error('No authentication cookie received');
      }

      return {
        success: true,
        userId: response.userId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed'
      };
    }
  }

  async signup(data: {
    username: string;
    password: string;
    birthday: string;
    captchaToken: string;
    gender?: number;
  }): Promise<AuthResult> {
    const profile = browserProfileGenerator.getRandomProfile();
    const csrfToken = await this.getCsrfToken();

    try {
      const response = await networkClient.request({
        method: 'POST',
        url: this.SIGNUP_URL,
        headers: {
          'User-Agent': profile.userAgent,
          'X-CSRF-TOKEN': csrfToken,
          'Content-Type': 'application/json',
          'Roblox-Challenge-Type': 'captcha',
          'Roblox-Challenge-Token': data.captchaToken
        },
        data: {
          username: data.username,
          password: data.password,
          birthday: data.birthday,
          gender: data.gender || 2,
          isTosAgreementBoxChecked: true,
          agreementIds: [
            "848d8d8f-0e33-4176-bcd9-aa4e22ae7905",
            "54d8a8f0-d9c8-4cf3-bd26-0cbf8af0bba3"
          ]
        }
      });

      if (response.errors) {
        throw new Error(response.errors[0]?.message || 'Signup failed');
      }

      return {
        success: true,
        userId: response.userId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Signup failed'
      };
    }
  }

  async validateUsername(username: string): Promise<boolean> {
    try {
      const response = await networkClient.request({
        method: 'POST',
        url: 'https://auth.roblox.com/v1/usernames/validate',
        data: {
          username,
          birthday: null,
          context: "Signup"
        }
      });

      return response.code === 0;
    } catch {
      return false;
    }
  }
}

export const robloxAuth = RobloxAuth.getInstance();