import axios from 'axios';
import * as cheerio from 'cheerio';
import { CardData } from '../../types/market';
import { proxyRotator } from '../proxy';

class MTGScraper {
  private static instance: MTGScraper;
  private readonly TCG_BASE_URL = 'https://www.tcgplayer.com';
  private readonly SCRYFALL_API = 'https://api.scryfall.com';
  private readonly HEADERS = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  };

  private constructor() {}

  static getInstance(): MTGScraper {
    if (!MTGScraper.instance) {
      MTGScraper.instance = new MTGScraper();
    }
    return MTGScraper.instance;
  }

  async getCardData(cardName: string): Promise<Partial<CardData>> {
    try {
      // Try Scryfall API first
      const scryfallData = await this.getScryfallData(cardName);
      
      // Get TCGPlayer prices
      const tcgPrices = await this.getTCGPlayerPrices(cardName);

      return {
        name: scryfallData.name,
        set: scryfallData.set_name,
        number: scryfallData.collector_number,
        rarity: scryfallData.rarity,
        type: 'mtg',
        imageUrl: scryfallData.image_uris?.normal,
        marketPrice: tcgPrices.marketPrice,
        priceHistory: tcgPrices.history
      };
    } catch (error) {
      console.error('MTG scraping error:', error);
      throw error;
    }
  }

  private async getScryfallData(cardName: string): Promise<any> {
    const response = await axios.get(`${this.SCRYFALL_API}/cards/named`, {
      params: { exact: cardName }
    });
    return response.data;
  }

  private async getTCGPlayerPrices(cardName: string): Promise<{
    marketPrice: number;
    history: { date: Date; price: number }[];
  }> {
    const proxy = await proxyRotator.getProxy();

    try {
      const searchUrl = `${this.TCG_BASE_URL}/magic/product/show?ProductName=${encodeURIComponent(cardName)}`;
      const response = await axios.get(searchUrl, {
        headers: this.HEADERS,
        proxy: proxy ? {
          host: proxy.host,
          port: proxy.port,
          auth: proxy.auth
        } : undefined
      });

      const $ = cheerio.load(response.data);
      const marketPrice = this.extractMarketPrice($);
      const priceHistory = this.extractPriceHistory($);

      return {
        marketPrice,
        history: priceHistory
      };
    } catch (error) {
      console.error('TCGPlayer scraping error:', error);
      throw error;
    }
  }

  private extractMarketPrice($: cheerio.CheerioAPI): number {
    const priceText = $('.product-details__market-price').text();
    return this.parsePrice(priceText);
  }

  private extractPriceHistory($: cheerio.CheerioAPI): { date: Date; price: number }[] {
    const history: { date: Date; price: number }[] = [];
    
    $('.price-history__point').each((_, element) => {
      const date = $(element).attr('data-date');
      const price = $(element).attr('data-price');
      
      if (date && price) {
        history.push({
          date: new Date(date),
          price: parseFloat(price)
        });
      }
    });

    return history;
  }

  private parsePrice(text: string): number {
    const match = text.match(/\$\s*([\d,]+\.?\d*)/);
    return match ? parseFloat(match[1].replace(/,/g, '')) : 0;
  }
}

export const mtgScraper = MTGScraper.getInstance();