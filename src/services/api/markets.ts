import axios from 'axios';
import { MarketItem, ArbitrageOpportunity } from '../../types/market';
import { config } from '../../config';
import { proxyManager } from '../proxy';
import { browserFunCaptchaSolver } from '../funcaptcha/browser-solver';
import { rateLimiters } from '../rate-limiter';

class MarketAPI {
  private static instance: MarketAPI;
  
  private constructor() {}

  static getInstance(): MarketAPI {
    if (!MarketAPI.instance) {
      MarketAPI.instance = new MarketAPI();
    }
    return MarketAPI.instance;
  }

  private async makeRequest(market: 'steam' | 'buff' | 'skinport', url: string, options = {}) {
    await rateLimiters[market].throttle();
    
    const proxy = proxyManager.getCurrentProxy();
    const config = {
      ...options,
      ...(proxy ? {
        headers: {
          ...options.headers,
          ...proxy.headers
        }
      } : {})
    };

    return axios(url, config);
  }

  async getSteamPrice(itemName: string): Promise<number> {
    try {
      const response = await this.makeRequest('steam', config.markets.steam.apiUrl, {
        params: {
          appid: 730,
          currency: 1,
          market_hash_name: itemName,
        },
        headers: {
          Cookie: config.markets.steam.cookie,
        },
      });

      if (response.data.success) {
        return parseFloat(response.data.lowest_price.replace('$', ''));
      }
      throw new Error('Invalid Steam response');
    } catch (error) {
      if (error.response?.status === 403) {
        await this.handleSteamCaptcha();
        return this.getSteamPrice(itemName);
      }
      throw error;
    }
  }

  private async handleSteamCaptcha(): Promise<void> {
    const captchaImage = await this.getCaptchaImage();
    const solved = await browserFunCaptchaSolver.solve(captchaImage);
    if (!solved) {
      throw new Error('Failed to solve Steam captcha');
    }
  }

  private async getCaptchaImage(): Promise<string> {
    // Implementation for getting captcha image
    return '';
  }

  // Rest of the MarketAPI implementation remains the same
}

export const marketAPI = MarketAPI.getInstance();