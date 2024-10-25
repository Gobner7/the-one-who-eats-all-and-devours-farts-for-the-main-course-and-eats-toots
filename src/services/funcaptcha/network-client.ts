import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { browserProfileGenerator } from './browser-profile';
import { EventEmitter } from './event-emitter';
import { proxyManager } from '../proxy';

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

export class NetworkClient extends EventEmitter {
  private static instance: NetworkClient;
  private readonly DEFAULT_TIMEOUT = 30000;
  private readonly DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000
  };

  private constructor() {
    super();
  }

  static getInstance(): NetworkClient {
    if (!NetworkClient.instance) {
      NetworkClient.instance = new NetworkClient();
    }
    return NetworkClient.instance;
  }

  async request<T = any>(config: AxiosRequestConfig): Promise<T & { headers?: any }> {
    const profile = browserProfileGenerator.getRandomProfile();
    const finalConfig: AxiosRequestConfig = {
      timeout: this.DEFAULT_TIMEOUT,
      withCredentials: true,
      ...config,
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'User-Agent': profile.userAgent,
        ...config.headers
      }
    };

    try {
      const response = await this.executeWithRetry(async () => {
        const res = await axios(finalConfig);
        
        if (!res.data && config.method?.toLowerCase() !== 'head') {
          throw new Error('Empty response received');
        }

        return res;
      });

      return {
        ...response.data,
        headers: response.headers
      };
    } catch (error) {
      throw error instanceof Error ? error : new Error('Network request failed');
    }
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    retryConfig: RetryConfig = this.DEFAULT_RETRY_CONFIG
  ): Promise<T> {
    let attempts = 0;
    let lastError: Error | null = null;

    while (attempts < retryConfig.maxRetries) {
      try {
        return await operation();
      } catch (error) {
        attempts++;
        lastError = error instanceof Error ? error : new Error('Unknown error');

        if (attempts === retryConfig.maxRetries) {
          throw lastError;
        }

        await new Promise(resolve => setTimeout(resolve, retryConfig.baseDelay * Math.pow(2, attempts)));
      }
    }

    throw lastError || new Error('Operation failed');
  }

  async get<T = any>(url: string, config?: Omit<AxiosRequestConfig, 'url'>): Promise<T> {
    return this.request<T>({ ...config, url, method: 'GET' });
  }

  async post<T = any>(url: string, data?: any, config?: Omit<AxiosRequestConfig, 'url' | 'data'>): Promise<T> {
    return this.request<T>({ ...config, url, method: 'POST', data });
  }

  async head<T = any>(url: string, config?: Omit<AxiosRequestConfig, 'url'>): Promise<T> {
    return this.request<T>({ ...config, url, method: 'HEAD' });
  }
}

export const networkClient = NetworkClient.getInstance();