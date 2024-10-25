import axios from 'axios';
import * as cheerio from 'cheerio';
import { CardListing } from '../../types/market';
import { proxyRotator } from '../proxy';
import { rateLimiter } from './rate-limiter';

export class TCGPlayerScraper {
  private static instance: TCGPlayerScraper;
  private readonly BASE_URL = 'https://www.tcgplayer.com';
  private readonly HEADERS = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  };

  private constructor() {}

  static getInstance(): TCGPlayerScraper {
    if (!TCGPlayerScraper.instance) {
      TCGPlayerScraper.instance = new TCGPlayerScraper();
    }
    return TCGPlayerScraper.instance;
  }

  async searchListings(query: string, options: {
    game?: 'magic' | 'pokemon' | 'yugioh';
    condition?: string;
    maxPrice?: number;
    set?: string;
  } = {}): Promise<CardListing[]> {
    await rateLimiter.throttle('tcgplayer');
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
      console.error('TCGPlayer search error:', error);
      throw error;
    }
  }

  async getMarketPrice(cardName: string, options: {
    game?: 'magic' | 'pokemon' | 'yugioh';
    set?: string;
  } = {}): Promise<{
    marketPrice: number;
    listedMedian: number;
    buylistMarket: number;
  }> {
    await rateLimiter.throttle('tcgplayer');
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
      return this.extractPriceData($);
    } catch (error) {
      console.error('TCGPlayer price error:', error);
      throw error;
    }
  }

  async getPriceHistory(cardName: string, options: {
    game?: 'magic' | 'pokemon' | 'yugioh';
    set?: string;
    days?: number;
  } = {}): Promise<Array<{
    date: Date;
    marketPrice: number;
    listedMedian: number;
    buylistMarket: number;
  }>> {
    await rateLimiter.throttle('tcgplayer');
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
      console.error('TCGPlayer price history error:', error);
      throw error;
    }
  }

  private buildSearchUrl(query: string, options: {
    game?: 'magic' | 'pokemon' | 'yugioh';
    set?: string;
  }): string {
    let path = '';
    switch (options.game) {
      case 'magic':
        path = '/magic';
        break;
      case 'pokemon':
        path = '/pokemon';
        break;
      case 'yugioh':
        path = '/yugioh';
        break;
      default:
        path = '/magic'; // Default to MTG
    }

    const searchPath = `/product/search?q=${encodeURIComponent(query)}`;
    if (options.set) {
      searchPath += `&setName=${encodeURIComponent(options.set)}`;
    }

    return `${this.BASE_URL}${path}${searchPath}`;
  }

  private parseListings($: cheerio.CheerioAPI): CardListing[] {
    const listings: CardListing[] = [];

    $('.product-listing').each((_, element) => {
      const $item = $(element);
      const title = $item.find('.product-listing__name').text().trim();
      const priceText = $item.find('.product-listing__price').text().trim();
      const price = this.extractPrice(priceText);

      if (!title || !price) return;

      const shippingText = $item.find('.product-listing__shipping').text().trim();
      const shipping = this.extractPrice(shippingText) || 0;
      const imageUrl = $item.find('.product-listing__image').attr('src') || '';
      const url = this.BASE_URL + ($item.find('.product-listing__link').attr('href') || '');
      const condition = $item.find('.product-listing__condition').text().trim();

      const sellerInfo = {
        id: $item.find('.seller-info__name').text().trim(),
        name: $item.find('.seller-info__name').text().trim(),
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
        platform: 'tcgplayer',
        imageUrl,
        url,
        isAuction: false,
        lastUpdated: new Date()
      });
    });

    return listings;
  }

  private extractPriceData($: cheerio.CheerioAPI): {
    marketPrice: number;
    listedMedian: number;
    buylistMarket: number;
  } {
    return {
      marketPrice: this.extractPrice($('.price-point__market').text()),
      listedMedian: this.extractPrice($('.price-point__median').text()),
      buylistMarket: this.extractPrice($('.price-point__buylist').text())
    };
  }

  private extractPriceHistory($: cheerio.CheerioAPI, days: number = 30): Array<{
    date: Date;
    marketPrice: number;
    listedMedian: number;
    buylistMarket: number;
  }> {
    const history: Array<{
      date: Date;
      marketPrice: number;
      listedMedian: number;
      buylistMarket: number;
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
        marketPrice: this.extractPrice($point.attr('data-market') || '0'),
        listedMedian: this.extractPrice($point.attr('data-median') || '0'),
        buylistMarket: this.extractPrice($point.attr('data-buylist') || '0')
      });
    });

    return history.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  private extractPrice(text: string): number {
    const match = text.match(/\$\s*([\d,]+\.?\d*)/);
    return match ? parseFloat(match[1].replace(/,/g, '')) : 0;
  }

  private extractSellerRating($item: cheerio.Cheerio): number {
    const ratingText = $item.find('.seller-info__rating').text().trim();
    const match = ratingText.match(/([\d.]+)/);
    return match ? parseFloat(match[1]) : 0;
  }

  private extractSellerSales($item: cheerio.Cheerio): number {
    const salesText = $item.find('.seller-info__sales').text().trim();
    const match = salesText.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }
}

export const tcgPlayerScraper = TCGPlayerScraper.getInstance();