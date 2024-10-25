import axios from 'axios';
import * as cheerio from 'cheerio';
import { proxyRotator } from '../proxy';
import { rateLimiter } from './rate-limiter';

interface CardLadderData {
  marketPrice: number;
  lastSale: number;
  pop: number;
  grade: string;
  trend30: number;
  trend90: number;
  salesHistory: Array<{
    date: Date;
    price: number;
    source: string;
  }>;
}

export class CardLadderScraper {
  private static instance: CardLadderScraper;
  private readonly BASE_URL = 'https://www.cardladder.com';
  private readonly HEADERS = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };

  private constructor() {}

  static getInstance(): CardLadderScraper {
    if (!CardLadderScraper.instance) {
      CardLadderScraper.instance = new CardLadderScraper();
    }
    return CardLadderScraper.instance;
  }

  async getCardData(cardName: string, options: {
    sport?: string;
    year?: string;
    grade?: string;
  } = {}): Promise<CardLadderData> {
    await rateLimiter.throttle('cardladder');
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
      return this.parseCardData($);
    } catch (error) {
      console.error('CardLadder scraping error:', error);
      throw error;
    }
  }

  async getMarketMovers(options: {
    sport?: string;
    timeframe?: '24h' | '7d' | '30d';
  } = {}): Promise<Array<{
    cardName: string;
    sport: string;
    priceChange: number;
    percentChange: number;
    volume: number;
    grade: string;
  }>> {
    await rateLimiter.throttle('cardladder');
    const proxy = await proxyRotator.getProxy();

    try {
      const url = `${this.BASE_URL}/market-movers${options.sport ? `/${options.sport}` : ''}`;
      const response = await axios.get(url, {
        headers: this.HEADERS,
        params: {
          timeframe: options.timeframe || '24h'
        },
        proxy: proxy ? {
          host: proxy.host,
          port: proxy.port,
          auth: proxy.auth
        } : undefined
      });

      const $ = cheerio.load(response.data);
      return this.parseMarketMovers($);
    } catch (error) {
      console.error('CardLadder market movers error:', error);
      throw error;
    }
  }

  async getPopulationReport(cardName: string, options: {
    sport?: string;
    year?: string;
  } = {}): Promise<Array<{
    grade: string;
    population: number;
    plusCount?: number;
    qualifierCount?: number;
  }>> {
    await rateLimiter.throttle('cardladder');
    const proxy = await proxyRotator.getProxy();

    try {
      const url = this.buildSearchUrl(cardName, options) + '/population';
      const response = await axios.get(url, {
        headers: this.HEADERS,
        proxy: proxy ? {
          host: proxy.host,
          port: proxy.port,
          auth: proxy.auth
        } : undefined
      });

      const $ = cheerio.load(response.data);
      return this.parsePopulationReport($);
    } catch (error) {
      console.error('CardLadder population report error:', error);
      throw error;
    }
  }

  private buildSearchUrl(cardName: string, options: {
    sport?: string;
    year?: string;
    grade?: string;
  }): string {
    let url = `${this.BASE_URL}/cards/search?q=${encodeURIComponent(cardName)}`;
    
    if (options.sport) {
      url += `&sport=${encodeURIComponent(options.sport)}`;
    }
    if (options.year) {
      url += `&year=${encodeURIComponent(options.year)}`;
    }
    if (options.grade) {
      url += `&grade=${encodeURIComponent(options.grade)}`;
    }

    return url;
  }

  private parseCardData($: cheerio.CheerioAPI): CardLadderData {
    const marketPrice = this.extractPrice($('.market-price').text());
    const lastSale = this.extractPrice($('.last-sale').text());
    const pop = this.extractNumber($('.population').text());
    const grade = $('.grade').text().trim();
    const trend30 = this.extractPercentage($('.trend-30d').text());
    const trend90 = this.extractPercentage($('.trend-90d').text());

    const salesHistory: Array<{
      date: Date;
      price: number;
      source: string;
    }> = [];

    $('.sales-history tr').each((_, element) => {
      const $row = $(element);
      const date = new Date($row.find('.sale-date').text());
      const price = this.extractPrice($row.find('.sale-price').text());
      const source = $row.find('.sale-source').text().trim();

      if (!isNaN(date.getTime()) && price > 0) {
        salesHistory.push({ date, price, source });
      }
    });

    return {
      marketPrice,
      lastSale,
      pop,
      grade,
      trend30,
      trend90,
      salesHistory: salesHistory.sort((a, b) => b.date.getTime() - a.date.getTime())
    };
  }

  private parseMarketMovers($: cheerio.CheerioAPI): Array<{
    cardName: string;
    sport: string;
    priceChange: number;
    percentChange: number;
    volume: number;
    grade: string;
  }> {
    const movers: Array<{
      cardName: string;
      sport: string;
      priceChange: number;
      percentChange: number;
      volume: number;
      grade: string;
    }> = [];

    $('.market-movers tr').each((_, element) => {
      const $row = $(element);
      const cardName = $row.find('.card-name').text().trim();
      const sport = $row.find('.sport').text().trim();
      const priceChange = this.extractPrice($row.find('.price-change').text());
      const percentChange = this.extractPercentage($row.find('.percent-change').text());
      const volume = this.extractNumber($row.find('.volume').text());
      const grade = $row.find('.grade').text().trim();

      if (cardName && !isNaN(percentChange)) {
        movers.push({
          cardName,
          sport,
          priceChange,
          percentChange,
          volume,
          grade
        });
      }
    });

    return movers;
  }

  private parsePopulationReport($: cheerio.CheerioAPI): Array<{
    grade: string;
    population: number;
    plusCount?: number;
    qualifierCount?: number;
  }> {
    const populations: Array<{
      grade: string;
      population: number;
      plusCount?: number;
      qualifierCount?: number;
    }> = [];

    $('.population-report tr').each((_, element) => {
      const $row = $(element);
      const grade = $row.find('.grade').text().trim();
      const population = this.extractNumber($row.find('.population').text());
      const plusCount = this.extractNumber($row.find('.plus-count').text());
      const qualifierCount = this.extractNumber($row.find('.qualifier-count').text());

      if (grade && population > 0) {
        populations.push({
          grade,
          population,
          ...(plusCount > 0 && { plusCount }),
          ...(qualifierCount > 0 && { qualifierCount })
        });
      }
    });

    return populations;
  }

  private extractPrice(text: string): number {
    const match = text.match(/\$\s*([\d,]+\.?\d*)/);
    return match ? parseFloat(match[1].replace(/,/g, '')) : 0;
  }

  private extractNumber(text: string): number {
    const match = text.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  private extractPercentage(text: string): number {
    const match = text.match(/([-+]?\d+\.?\d*)%/);
    return match ? parseFloat(match[1]) : 0;
  }
}

export const cardLadderScraper = CardLadderScraper.getInstance();