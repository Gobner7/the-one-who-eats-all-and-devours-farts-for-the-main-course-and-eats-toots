import { EventEmitter } from '../funcaptcha/event-emitter';
import { browserFunCaptchaSolver } from '../funcaptcha/browser-solver';
import { networkClient } from '../funcaptcha/network-client';
import { browserProfileGenerator } from '../funcaptcha/browser-profile';
import { robloxAuth } from './auth';

interface AccountCreationResult {
  success: boolean;
  username?: string;
  password?: string;
  error?: string;
  captchaToken?: string;
}

export class RobloxAccountCreator extends EventEmitter {
  private static instance: RobloxAccountCreator;
  private isCreating: boolean = false;

  private constructor() {
    super();
  }

  static getInstance(): RobloxAccountCreator {
    if (!RobloxAccountCreator.instance) {
      RobloxAccountCreator.instance = new RobloxAccountCreator();
    }
    return RobloxAccountCreator.instance;
  }

  async createAccount(options: {
    username?: string;
    password?: string;
    birthday?: string;
    gender?: 2 | 3;
  } = {}): Promise<AccountCreationResult> {
    if (this.isCreating) {
      throw new Error('Account creation already in progress');
    }

    this.isCreating = true;

    try {
      // Generate account details if not provided
      const username = options.username || await this.generateUniqueUsername();
      const password = options.password || this.generatePassword();
      const birthday = options.birthday || this.generateBirthday();
      const gender = options.gender || 2;

      // Get and solve FunCaptcha
      const token = await browserFunCaptchaSolver.solve({
        publicKey: '476068BF-9607-4799-B53D-966BE98E2B81',
        siteUrl: 'https://www.roblox.com',
        action: 'signup'
      });

      if (!token.success || !token.token) {
        throw new Error('Failed to solve captcha');
      }

      // Create account
      const result = await robloxAuth.signup({
        username,
        password,
        birthday,
        captchaToken: token.token,
        gender
      });

      if (result.success) {
        return {
          success: true,
          username,
          password,
          captchaToken: token.token
        };
      }

      throw new Error(result.error || 'Account creation failed');
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      this.isCreating = false;
    }
  }

  private async generateUniqueUsername(): Promise<string> {
    const maxAttempts = 10;
    let attempts = 0;

    while (attempts < maxAttempts) {
      const username = this.generateUsername();
      if (await robloxAuth.validateUsername(username)) {
        return username;
      }
      attempts++;
    }

    throw new Error('Failed to generate unique username');
  }

  private generateUsername(): string {
    const prefix = ['Cool', 'Epic', 'Super', 'Awesome', 'Pro'];
    const suffix = ['Gamer', 'Player', 'Master', 'Champion', 'Star'];
    const random = Math.floor(Math.random() * 10000);
    return `${prefix[Math.floor(Math.random() * prefix.length)]}${suffix[Math.floor(Math.random() * suffix.length)]}${random}`;
  }

  private generatePassword(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars[Math.floor(Math.random() * chars.length)];
    }
    return password;
  }

  private generateBirthday(): string {
    const year = Math.floor(Math.random() * (2008 - 2000)) + 2000;
    const month = Math.floor(Math.random() * 12) + 1;
    const day = Math.floor(Math.random() * 28) + 1;
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  }
}

export const robloxAccountCreator = RobloxAccountCreator.getInstance();