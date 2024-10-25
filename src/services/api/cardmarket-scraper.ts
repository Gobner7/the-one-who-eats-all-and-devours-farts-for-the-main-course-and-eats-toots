import axios from 'axios';
import * as cheerio from 'cheerio';
import { CardListing } from '../../types/market';
import { proxyRotator } from '../proxy';
import { rateLimiter } from './rate-limiter';

export class CardMarketScraper {
  private static instance: CardMarketScraper;
  private readonly BASE_URL = 'https://www.cardmarket.com';
  private readonly HEADERS = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  };

  private constructor() {}

  static getInstance(): CardMarketScraper {
    if (!CardMarketScraper.instance) {
      CardMarketScraper.instance = new CardMarketScraper();
    }
    return CardMarketScraper.instance;
  }

  async searchListings(query: string, options: {
    game?: 'magic' | 'pokemon' | 'yugioh';
    language?: string;
    condition?: string;
    maxPrice?: number;
  } = {}): Promise<CardListing[]> {
    await rateLimiter.throttle('cardmarket');
    const proxy = await proxyRotator.getProxy();

    try {
      const url = this.buildSearchUrl(query, options);
      const response = await axios.get(url, {
        headers: this.HEADERS,
        proxy: proxy ? {
          host: proxy.host,
          port: proxy.port,
          auth: proxy.auth
        } : undefined
      });

      const $ = cheerio.load(response.data);
      return this.parseListings($);
    } catch (error) {
      console.error('CardMarket search error:', error);
      throw error;
    }
  }

  async getPriceGuide(cardName: string, options: {
    game?: 'magic' | 'pokemon' | 'yugioh';
    expansion?: string;
  } = {}): Promise<{
    low: number;
    trend: number;
    avg30: number;
    avg7: number;
    avg1: number;
    foilTrend?: number;
  }> {
    await rateLimiter.throttle('cardmarket');
    const proxy = await proxyRotator.getProxy();

    try {
      const url = this.buildSearchUrl(cardName, options);
      const response = await axios.get(url, {
        headers: this.HEADERS,
        proxy: proxy ? {
          host: proxy.host,
          port: proxy.port,
          auth: proxy.auth
        } : undefined
      });

      const $ = cheerio.load(response.data);
      return this.extractPriceGuide($);
    } catch (error) {
      console.error('CardMarket price guide error:', error);
      throw error;
    }
  }

  async getPriceHistory(cardName: string, options: {
    game?: 'magic' | 'pokemon' | 'yugioh';
    expansion?: string;
    days?: number;
  } = {}): Promise<Array<{
    date: Date;
    price: number;
    foilPrice?: number;
  }>> {
    await rateLimiter.throttle('cardmarket');
    const proxy = await proxyRotator.getProxy();

    try {
      const url = `${this.buildSearchUrl(cardName, options)}/price-history`;
      const response = await axios.get(url, {
        headers: this.HEADERS,
        proxy: proxy ? {
          host: proxy.host,
          port: proxy.port,
          auth: proxy.auth
        } : undefined
      });

      const $ = cheerio.load(response.data);
      return this.extractPriceHistory($, options.days);
    } catch (error) {
      console.error('CardMarket price history error:', error);
      throw error;
    }
  }

  private buildSearchUrl(query: string, options: {
    game?: 'magic' | 'pokemon' | 'yugioh';
    expansion?: string;
  }): string {
    let path = '';
    switch (options.game) {
      case 'magic':
        path = '/Magic';
        break;
      case 'pokemon':
        path = '/Pokemon';
        break;
      case 'yugioh':
        path = '/YuGiOh';
        break;
      default:
        path = '/Magic'; // Default to MTG
    }

    let searchPath = `/Products/Search?searchString=${encodeURIComponent(query)}`;
    if (options.expansion) {
      searchPath += `&idExpansion=${encodeURIComponent(options.expansion)}`;
    }

    return `${this.BASE_URL}${path}${searchPath}`;
  }

  private parseListings($: cheerio.CheerioAPI): CardListing[] {
    const listings: CardListing[] = [];

    $('.article-row').each((_, element) => {
      const $item = $(element);
      const title = $item.find('.card-name').text().trim();
      const priceText = $item.find('.price-container').text().trim();
      const price = this.extractPrice(priceText);

      if (!title || !price) return;

      const imageUrl = $item.find('.card-image').attr('src') || '';
      const url = this.BASE_URL + ($item.find('.card-name').attr('href') || '');
      const condition = $item.find('.article-condition').text().trim();
      const shipping = this.extractPrice($item.find('.shipping-cost').text());

      const sellerInfo = {
        id: $item.find('.seller-name').attr('href')?.split('/').pop() || '',
        name: $item.find('.seller-name').text().trim(),
        rating: this.extractSellerRating($item),
        totalSales: this.extractSellerSales($item)
      };

      listings.push({
        id: crypto.randomUUID(),
        title,
        price,
        shipping,
        condition,
        seller: sellerInfo,
        platform: 'cardmarket',
        imageUrl,
        url,
        isAuction: false,
        lastUpdated: new Date()
      });
    });

    return listings;
  }

  private extractPriceGuide($: cheerio.CheerioAPI): {
    low: number;
    trend: number;
    avg30: number;
    avg7: number;
    avg1: number;
    foilTrend?: number;
  } {
    return {
      low: this.extractPrice($('.price-guide__low').text()),
      trend: this.extractPrice($('.price-guide__trend').text()),
      avg30: this.extractPrice($('.price-guide__30d').text()),
      avg7: this.extractPrice($('.price-guide__7d').text()),
      avg1: this.extractPrice($('.price-guide__1d').text()),
      foilTrend: this.extractPrice($('.price-guide__foil-trend').text())
    };
  }

  private extractPriceHistory($: cheerio.CheerioAPI, days: number = 30): Array<{
    date: Date;
    price: number;
    foilPrice?: number;
  }> {
    const history: Array<{
      date: Date;
      price: number;
      foilPrice?: number;
    }> = [];

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    $('.price-history__point').each((_, element) => {
      const $point = $(element);
      const dateStr = $point.attr('data-date');
      if (!dateStr) return;

      const date = new Date(dateStr);
      if (date < cutoff) return;

      history.push({
        date,
        price: this.extractPrice($point.attr('data-price') || '0'),
        foilPrice: this.extractPrice($point.attr('data-foil-price') || '0')
      });
    });

    return history.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  private extractPrice(text: string): number {
    // Handle both € and $ formats
    const match = text.match(/([\d.,]+)(?:\s*[€$]|[€$]\s*)([\d.,]*)/);
    if (!match) return 0;

    const [, whole, decimal] = match;
    return parseFloat(`${whole.replace(',', '')}.${decimal || '0'}`);
  }

  private extractSellerRating($item: cheerio.Cheerio): number {
    const ratingText = $item.find('.seller-rating').text().trim();
    const match = ratingText.match(/([\d.]+)/);
    return match ? parseFloat(match[1]) : 0;
  }

  private extractSellerSales($item: cheerio.Cheerio): number {
    const salesText = $item.find('.seller-sales').text().trim();
    const match = salesText.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }
}

export const cardMarketScraper = CardMarketScraper.getInstance();