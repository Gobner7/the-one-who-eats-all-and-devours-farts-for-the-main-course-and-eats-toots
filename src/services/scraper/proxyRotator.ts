import { EventEmitter } from '../eventEmitter';

interface Proxy {
  ip: string;
  port: number;
  username?: string;
  password?: string;
  protocol: 'http' | 'https';
  lastUsed: number;
  successCount: number;
  failureCount: number;
}

class ProxyRotator extends EventEmitter {
  private proxies: Proxy[] = [];
  private currentIndex = 0;
  private readonly CHECK_INTERVAL = 300000; // 5 minutes
  private readonly MAX_FAILURES = 3;

  constructor() {
    super();
    this.loadProxies();
    this.startHealthCheck();
  }

  private async loadProxies() {
    // Load proxies from environment variables
    const proxyList = import.meta.env.VITE_PROXY_LIST?.split(',') || [];
    
    this.proxies = proxyList.map(proxy => {
      const [ip, port] = proxy.split(':');
      return {
        ip,
        port: parseInt(port),
        protocol: 'https',
        lastUsed: 0,
        successCount: 0,
        failureCount: 0
      };
    });

    // Add fallback proxy if none provided
    if (this.proxies.length === 0) {
      this.proxies.push({
        ip: '127.0.0.1',
        port: 8080,
        protocol: 'https',
        lastUsed: 0,
        successCount: 0,
        failureCount: 0
      });
    }
  }

  async getProxy(): Promise<Proxy> {
    if (this.proxies.length === 0) {
      throw new Error('No proxies available');
    }

    // Get least recently used working proxy
    const proxy = this.proxies
      .filter(p => p.failureCount < this.MAX_FAILURES)
      .sort((a, b) => a.lastUsed - b.lastUsed)[0];

    if (!proxy) {
      throw new Error('No healthy proxies available');
    }

    proxy.lastUsed = Date.now();
    return proxy;
  }

  async reportSuccess(ip: string) {
    const proxy = this.proxies.find(p => p.ip === ip);
    if (proxy) {
      proxy.successCount++;
      proxy.failureCount = 0;
      this.emit('proxySuccess', proxy);
    }
  }

  async reportFailure(ip: string) {
    const proxy = this.proxies.find(p => p.ip === ip);
    if (proxy) {
      proxy.failureCount++;
      if (proxy.failureCount >= this.MAX_FAILURES) {
        this.emit('proxyDisabled', proxy);
      }
    }
  }

  private async startHealthCheck() {
    setInterval(async () => {
      for (const proxy of this.proxies) {
        try {
          await this.checkProxy(proxy);
          this.emit('proxyHealthy', proxy);
        } catch (error) {
          await this.reportFailure(proxy.ip);
        }
      }
    }, this.CHECK_INTERVAL);
  }

  private async checkProxy(proxy: Proxy): Promise<void> {
    try {
      const response = await fetch('https://api.ipify.org?format=json', {
        headers: {
          'Proxy-Authorization': proxy.username ? 
            `Basic ${btoa(`${proxy.username}:${proxy.password}`)}` : ''
        }
      });

      if (!response.ok) {
        throw new Error(`Proxy check failed: ${response.statusText}`);
      }
    } catch (error) {
      throw new Error(`Proxy ${proxy.ip} is not working`);
    }
  }
}

export const proxyRotator = new ProxyRotator();