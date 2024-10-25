import { EventEmitter } from '../eventEmitter';

interface ProxyConfig {
  host: string;
  port: number;
  auth?: {
    username: string;
    password: string;
  };
}

class ProxyRotator extends EventEmitter {
  private static instance: ProxyRotator;
  private proxies: ProxyConfig[] = [];
  private currentIndex = 0;

  private constructor() {
    super();
    this.loadProxies();
  }

  static getInstance(): ProxyRotator {
    if (!ProxyRotator.instance) {
      ProxyRotator.instance = new ProxyRotator();
    }
    return ProxyRotator.instance;
  }

  private loadProxies() {
    // Load proxies from environment variables or configuration
    const proxyList = process.env.PROXY_LIST?.split(',') || [];
    
    this.proxies = proxyList.map(proxy => {
      const [host, port] = proxy.split(':');
      return {
        host,
        port: parseInt(port)
      };
    });
  }

  async getProxy(): Promise<ProxyConfig | null> {
    if (this.proxies.length === 0) {
      return null;
    }

    const proxy = this.proxies[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.proxies.length;
    return proxy;
  }

  async rotateProxy(): Promise<ProxyConfig | null> {
    this.currentIndex = (this.currentIndex + 1) % this.proxies.length;
    return this.getProxy();
  }
}

export const proxyRotator = ProxyRotator.getInstance();