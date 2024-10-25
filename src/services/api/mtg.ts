import axios from 'axios';
import { rateLimiter } from './rate-limiter';
import { mtgScraper } from './mtg-scraper';

interface MTGGraphQLConfig {
  endpoint: string;
  apiKey: string;
}

class MTGService {
  private static instance: MTGService;
  private config: MTGGraphQLConfig = {
    endpoint: 'https://api.mtgql.com/v1/graphql',
    apiKey: ''
  };
  private requestQueue: Map<string, Promise<any>> = new Map();

  private constructor() {
    this.loadConfig();
  }

  static getInstance(): MTGService {
    if (!MTGService.instance) {
      MTGService.instance = new MTGService();
    }
    return MTGService.instance;
  }

  private loadConfig() {
    const apiKey = localStorage.getItem('mtg_graphql_key');
    if (apiKey) {
      this.config.apiKey = apiKey;
    }
  }

  private async executeGraphQLQuery(query: string, variables: any) {
    await rateLimiter.throttle('mtg_graphql');

    try {
      const response = await axios.post(
        this.config.endpoint,
        {
          query,
          variables
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`
          }
        }
      );

      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        // Rate limit exceeded, use fallback
        throw new Error('RATE_LIMIT_EXCEEDED');
      }
      throw error;
    }
  }

  private getQueueKey(operation: string, variables: any): string {
    return `${operation}:${JSON.stringify(variables)}`;
  }

  private async queueRequest(operation: string, variables: any, fallback: () => Promise<any>) {
    const key = this.getQueueKey(operation, variables);
    
    if (this.requestQueue.has(key)) {
      return this.requestQueue.get(key);
    }

    const request = (async () => {
      try {
        const result = await this.executeGraphQLQuery(operation, variables);
        return result;
      } catch (error) {
        if (error.message === 'RATE_LIMIT_EXCEEDED') {
          console.warn('Rate limit exceeded, using fallback scraper');
          return fallback();
        }
        throw error;
      } finally {
        this.requestQueue.delete(key);
      }
    })();

    this.requestQueue.set(key, request);
    return request;
  }

  async searchCards(cardName: string) {
    const query = `
      query SearchCards($name: String!) {
        cards(filter: { name_eq: $name }) {
          name
          setCode
          type
          text
          prices {
            provider
            date
            cardType
            listType
            price
          }
        }
      }
    `;

    return this.queueRequest(
      'SearchCards',
      { name: cardName },
      () => mtgScraper.getCardData(cardName)
    );
  }

  async getCardPriceHistory(cardName: string) {
    const query = `
      query CardPriceHistory($name: String!) {
        cards(filter: { name_eq: $name }) {
          prices {
            provider
            date
            price
            cardType
            listType
          }
        }
      }
    `;

    return this.queueRequest(
      'CardPriceHistory',
      { name: cardName },
      async () => {
        const data = await mtgScraper.getCardData(cardName);
        return data.priceHistory || [];
      }
    );
  }

  async getSetData(setCode: string) {
    const query = `
      query SetData($code: String!) {
        sets(filter: { code_eq: $code }) {
          code
          name
          releaseDate
          totalSetSize
          cards {
            name
            number
            rarity
            prices {
              provider
              price
              date
            }
          }
        }
      }
    `;

    return this.queueRequest(
      'SetData',
      { code: setCode },
      async () => {
        // Fallback implementation for set data
        // This could be expanded based on needs
        throw new Error('Set data not available through fallback scraper');
      }
    );
  }

  getRateLimitInfo() {
    return {
      remaining: rateLimiter.getRemainingRequests('mtg_graphql'),
      resetIn: rateLimiter.getResetTime('mtg_graphql')
    };
  }
}

export const mtgService = MTGService.getInstance();