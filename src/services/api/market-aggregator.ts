import { CardListing, CardData } from '../../types/market';
import { ebayScraper } from './ebay-scraper';
import { tcgPlayerScraper } from './tcgplayer-scraper';
import { cardMarketScraper } from './cardmarket-scraper';
import { priceAnalyzer } from './price-analyzer';

export class MarketAggregator {
  private static instance: MarketAggregator;

  private constructor() {}

  static getInstance(): MarketAggregator {
    if (!MarketAggregator.instance) {
      MarketAggregator.instance = new MarketAggregator();
    }
    return MarketAggregator.instance;
  }

  async searchAllMarkets(query: string, options: {
    type: CardData['type'];
    maxPrice?: number;
    condition?: string;
  }): Promise<{
    listings: CardListing[];
    marketPrice: number;
    deals: Array<{
      listing: CardListing;
      discount: number;
      confidence: number;
    }>;
  }> {
    try {
      // Search all markets in parallel
      const [ebayListings, tcgListings, cardmarketListings] = await Promise.all([
        ebayScraper.searchListings(query, {
          maxPrice: options.maxPrice,
          condition: options.condition
        }),
        tcgPlayerScraper.searchListings(query, {
          game: options.type,
          maxPrice: options.maxPrice,
          condition: options.condition
        }),
        cardMarketScraper.searchListings(query, {
          game: options.type,
          condition: options.condition,
          maxPrice: options.maxPrice
        })
      ]);

      // Get completed sales for market analysis
      const completedSales = await ebayScraper.getCompletedListings(query, {
        days: 30,
        maxPrice: options.maxPrice,
        condition: options.condition
      });

      // Combine all listings
      const allListings = [
        ...ebayListings,
        ...tcgListings,
        ...cardmarketListings
      ];

      // Analyze prices and find deals
      const analysis = priceAnalyzer.analyzeListings(allListings, completedSales);

      return {
        listings: allListings,
        marketPrice: analysis.marketPrice,
        deals: analysis.deals.map(deal => ({
          listing: deal.listing,
          discount: deal.discount,
          confidence: deal.confidence
        }))
      };
    } catch (error) {
      console.error('Market aggregation error:', error);
      throw error;
    }
  }

  async getMarketPrices(cardName: string, options: {
    type: CardData['type'];
    set?: string;
  }): Promise<{
    tcgplayer: {
      market: number;
      listed: number;
      buylist: number;
    };
    cardmarket: {
      trend: number;
      low: number;
      avg30: number;
    };
    ebay: {
      average: number;
      recent: number;
    };
  }> {
    try {
      const [tcg, cardmarket, ebay] = await Promise.all([
        tcgPlayerScraper.getMarketPrice(cardName, {
          game: options.type,
          set: options.set
        }),
        cardMarketScraper.getPriceGuide(cardName, {
          game: options.type,
          expansion: options.set
        }),
        ebayScraper.getCompletedListings(cardName, { days: 7 })
      ]);

      const ebayPrices = ebay.map(listing => listing.price);
      const ebayAverage = ebayPrices.reduce((a, b) => a + b, 0) / ebayPrices.length;
      const ebayRecent = ebayPrices[0] || ebayAverage;

      return {
        tcgplayer: {
          market: tcg.marketPrice,
          listed: tcg.listedMedian,
          buylist: tcg.buylistMarket
        },
        cardmarket: {
          trend: cardmarket.trend,
          low: cardmarket.low,
          avg30: cardmarket.avg30
        },
        ebay: {
          average: ebayAverage,
          recent: ebayRecent
        }
      };
    } catch (error) {
      console.error('Market price aggregation error:', error);
      throw error;
    }
  }

  async getPriceHistory(cardName: string, options: {
    type: CardData['type'];
    set?: string;
    days?: number;
  }): Promise<Array<{
    date: Date;
    prices: {
      tcgplayer?: number;
      cardmarket?: number;
      ebay?: number;
    };
  }>> {
    try {
      const [tcg, cardmarket, ebay] = await Promise.all([
        tcgPlayerScraper.getPriceHistory(cardName, {
          game: options.type,
          set: options.set,
          days: options.days
        }),
        cardMarketScraper.getPriceHistory(cardName, {
          game: options.type,
          expansion: options.set,
          days: options.days
        }),
        ebayScraper.getCompletedListings(cardName, {
          days: options.days
        })
      ]);

      // Combine and normalize price history
      const dateMap = new Map<string, {
        date: Date;
        prices: {
          tcgplayer?: number;
          cardmarket?: number;
          ebay?: number;
        };
      }>();

      // Process TCGPlayer prices
      tcg.forEach(entry => {
        const dateStr = entry.date.toISOString().split('T')[0];
        if (!dateMap.has(dateStr)) {
          dateMap.set(dateStr, {
            date: entry.date,
            prices: {}
          });
        }
        dateMap.get(dateStr)!.prices.tcgplayer = entry.marketPrice;
      });

      // Process CardMarket prices
      cardmarket.forEach(entry => {
        const dateStr = entry.date.toISOString().split('T')[0];
        if (!dateMap.has(dateStr)) {
          dateMap.set(dateStr, {
            date: entry.date,
            prices: {}
          });
        }
        dateMap.get(dateStr)!.prices.cardmarket = entry.price;
      });

      // Process eBay prices
      ebay.forEach(listing => {
        const dateStr = listing.endTime!.toISOString().split('T')[0];
        if (!dateMap.has(dateStr)) {
          dateMap.set(dateStr, {
            date: listing.endTime!,
            prices: {}
          });
        }
        const entry = dateMap.get(dateStr)!;
        if (!entry.prices.ebay) {
          entry.prices.ebay = listing.price;
        } else {
          entry.prices.ebay = (entry.prices.ebay + listing.price) / 2;
        }
      });

      return Array.from(dateMap.values())
        .sort((a, b) => a.date.getTime() - b.date.getTime());
    } catch (error) {
      console.error('Price history aggregation error:', error);
      throw error;
    }
  }
}

export const marketAggregator = MarketAggregator.getInstance();