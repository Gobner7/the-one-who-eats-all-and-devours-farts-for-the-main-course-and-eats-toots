import axios from 'axios';
import * as cheerio from 'cheerio';
import { CardListing } from '../../types/market';
import { proxyRotator } from '../proxy';
import { rateLimiter } from './rate-limiter';

export class EbayScraper {
  private static instance: EbayScraper;
  private readonly BASE_URL = 'https://www.ebay.com';
  private readonly HEADERS = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  };

  private constructor() {}

  static getInstance(): EbayScraper {
    if (!EbayScraper.instance) {
      EbayScraper.instance = new EbayScraper();
    }
    return EbayScraper.instance;
  }

  async searchListings(query: string, options: {
    condition?: string;
    maxPrice?: number;
    category?: string;
  } = {}): Promise<CardListing[]> {
    await rateLimiter.throttle('ebay');
    const proxy = await proxyRotator.getProxy();

    try {
      const url = new URL('/sch/i.html', this.BASE_URL);
      url.searchParams.append('_nkw', query);
      if (options.category) url.searchParams.append('_sacat', options.category);
      if (options.maxPrice) url.searchParams.append('_udhi', options.maxPrice.toString());
      if (options.condition) url.searchParams.append('LH_ItemCondition', options.condition);

      const response = await axios.get(url.toString(), {
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
      console.error('eBay search error:', error);
      throw error;
    }
  }

  async getCompletedListings(query: string, options: {
    days?: number;
    condition?: string;
    maxPrice?: number;
  } = {}): Promise<CardListing[]> {
    await rateLimiter.throttle('ebay');
    const proxy = await proxyRotator.getProxy();

    try {
      const url = new URL('/sch/i.html', this.BASE_URL);
      url.searchParams.append('_nkw', query);
      url.searchParams.append('LH_Complete', '1');
      url.searchParams.append('LH_Sold', '1');
      if (options.maxPrice) url.searchParams.append('_udhi', options.maxPrice.toString());
      if (options.condition) url.searchParams.append('LH_ItemCondition', options.condition);

      const response = await axios.get(url.toString(), {
        headers: this.HEADERS,
        proxy: proxy ? {
          host: proxy.host,
          port: proxy.port,
          auth: proxy.auth
        } : undefined
      });

      const $ = cheerio.load(response.data);
      const listings = this.parseListings($, true);

      // Filter by date if specified
      if (options.days) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - options.days);
        return listings.filter(listing => 
          listing.endTime && listing.endTime >= cutoff
        );
      }

      return listings;
    } catch (error) {
      console.error('eBay completed listings error:', error);
      throw error;
    }
  }

  private parseListings($: cheerio.CheerioAPI, isCompleted: boolean = false): CardListing[] {
    const listings: CardListing[] = [];

    $('.s-item__wrapper').each((_, element) => {
      const $item = $(element);
      const title = $item.find('.s-item__title').text().trim();
      const priceText = $item.find('.s-item__price').text().trim();
      const price = this.extractPrice(priceText);

      if (!title || !price) return;

      const shippingText = $item.find('.s-item__shipping').text().trim();
      const shipping = this.extractPrice(shippingText) || 0;
      const imageUrl = $item.find('.s-item__image-img').attr('src') || '';
      const url = $item.find('.s-item__link').attr('href') || '';
      const condition = $item.find('.s-item__condition').text().trim();
      const bidsText = $item.find('.s-item__bids').text().trim();
      const bids = bidsText ? parseInt(bidsText) : undefined;
      const isAuction = !!bidsText;

      const sellerInfo = {
        id: $item.find('.s-item__seller-info-text').text().trim(),
        name: $item.find('.s-item__seller-info-text').text().trim(),
        rating: this.extractSellerRating($item),
        totalSales: this.extractSellerSales($item)
      };

      let endTime: Date | undefined;
      if (isCompleted) {
        const endTimeText = $item.find('.s-item__ended-date').text().trim();
        if (endTimeText) {
          endTime = new Date(endTimeText);
        }
      } else {
        const timeLeftText = $item.find('.s-item__time-left').text().trim();
        if (timeLeftText) {
          endTime = this.calculateEndTime(timeLeftText);
        }
      }

      listings.push({
        id: url.split('itm/')[1]?.split('?')[0] || crypto.randomUUID(),
        title,
        price,
        shipping,
        condition,
        seller: sellerInfo,
        platform: 'ebay',
        imageUrl,
        url,
        endTime,
        isAuction,
        bids,
        lastUpdated: new Date()
      });
    });

    return listings;
  }

  private extractPrice(text: string): number {
    const match = text.match(/\$\s*([\d,]+\.?\d*)/);
    return match ? parseFloat(match[1].replace(/,/g, '')) : 0;
  }

  private extractSellerRating($item: cheerio.Cheerio): number {
    const ratingText = $item.find('.x-star-rating').text().trim();
    const match = ratingText.match(/([\d.]+)/);
    return match ? parseFloat(match[1]) : 0;
  }

  private extractSellerSales($item: cheerio.Cheerio): number {
    const salesText = $item.find('.s-item__seller-info-text').text().trim();
    const match = salesText.match(/(\d+)\s+sales/i);
    return match ? parseInt(match[1]) : 0;
  }

  private calculateEndTime(timeLeft: string): Date {
    const now = new Date();
    const units = {
      'd': 24 * 60 * 60 * 1000,
      'h': 60 * 60 * 1000,
      'm': 60 * 1000,
      's': 1000
    };

    let totalMs = 0;
    for (const [unit, ms] of Object.entries(units)) {
      const match = timeLeft.match(new RegExp(`(\\d+)${unit}`));
      if (match) {
        totalMs += parseInt(match[1]) * ms;
      }
    }

    return new Date(now.getTime() + totalMs);
  }
}

export const ebayScraper = EbayScraper.getInstance();