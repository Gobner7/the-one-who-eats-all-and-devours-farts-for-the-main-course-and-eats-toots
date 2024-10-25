import { CardListing } from '../../types/market';

export class PriceAnalyzer {
  private static instance: PriceAnalyzer;

  private constructor() {}

  static getInstance(): PriceAnalyzer {
    if (!PriceAnalyzer.instance) {
      PriceAnalyzer.instance = new PriceAnalyzer();
    }
    return PriceAnalyzer.instance;
  }

  analyzeListings(currentListings: CardListing[], completedListings: CardListing[]) {
    const recentSales = this.filterRecentSales(completedListings, 30);
    const marketPrice = this.calculateMarketPrice(recentSales);
    const priceDistribution = this.calculatePriceDistribution(recentSales);
    const deals = this.findDeals(currentListings, marketPrice, priceDistribution);
    const trends = this.analyzePriceTrends(recentSales);

    return {
      marketPrice,
      priceDistribution,
      deals,
      trends,
      stats: {
        totalListings: currentListings.length,
        averagePrice: this.calculateAverage(currentListings.map(l => l.price)),
        medianPrice: this.calculateMedian(currentListings.map(l => l.price)),
        lowestPrice: Math.min(...currentListings.map(l => l.price)),
        highestPrice: Math.max(...currentListings.map(l => l.price)),
        recentSales: recentSales.length,
        priceChange24h: this.calculatePriceChange(recentSales, 1),
        priceChange7d: this.calculatePriceChange(recentSales, 7),
        volume24h: this.calculateVolume(recentSales, 1),
        volume7d: this.calculateVolume(recentSales, 7)
      }
    };
  }

  private filterRecentSales(listings: CardListing[], days: number): CardListing[] {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return listings.filter(listing => 
      listing.endTime && listing.endTime >= cutoff
    );
  }

  private calculateMarketPrice(recentSales: CardListing[]): number {
    if (recentSales.length === 0) return 0;

    // Remove outliers
    const prices = recentSales.map(s => s.price);
    const q1 = this.calculateQuantile(prices, 0.25);
    const q3 = this.calculateQuantile(prices, 0.75);
    const iqr = q3 - q1;
    const validPrices = prices.filter(p => 
      p >= q1 - 1.5 * iqr && p <= q3 + 1.5 * iqr
    );

    // Use weighted average of median and mean
    const median = this.calculateMedian(validPrices);
    const mean = this.calculateAverage(validPrices);
    return (median * 0.7) + (mean * 0.3);
  }

  private calculatePriceDistribution(listings: CardListing[]): {
    min: number;
    max: number;
    mean: number;
    median: number;
    standardDev: number;
    percentiles: { [key: number]: number };
  } {
    const prices = listings.map(l => l.price);
    
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
      mean: this.calculateAverage(prices),
      median: this.calculateMedian(prices),
      standardDev: this.calculateStandardDeviation(prices),
      percentiles: {
        10: this.calculateQuantile(prices, 0.1),
        25: this.calculateQuantile(prices, 0.25),
        75: this.calculateQuantile(prices, 0.75),
        90: this.calculateQuantile(prices, 0.9)
      }
    };
  }

  private findDeals(
    listings: CardListing[],
    marketPrice: number,
    distribution: ReturnType<typeof this.calculatePriceDistribution>
  ) {
    return listings
      .map(listing => {
        const totalPrice = listing.price + listing.shipping;
        const discount = ((marketPrice - totalPrice) / marketPrice) * 100;
        const zScore = (totalPrice - distribution.mean) / distribution.standardDev;
        const confidence = this.calculateDealConfidence(discount, zScore, listing);

        return {
          listing,
          marketPrice,
          discount,
          confidence,
          profitPotential: marketPrice - totalPrice
        };
      })
      .filter(deal => deal.discount > 0 && deal.confidence > 0.7)
      .sort((a, b) => b.confidence - a.confidence);
  }

  private calculateDealConfidence(
    discount: number,
    zScore: number,
    listing: CardListing
  ): number {
    let confidence = 1.0;

    // Adjust for extreme discounts
    if (discount > 50) {
      confidence *= 0.7; // Likely too good to be true
    }

    // Adjust for statistical deviation
    confidence *= Math.exp(-Math.abs(zScore) / 2);

    // Adjust for seller reputation
    if (listing.seller.rating > 98) {
      confidence *= 1.2;
    } else if (listing.seller.rating < 95) {
      confidence *= 0.8;
    }

    // Adjust for seller sales history
    if (listing.seller.totalSales > 1000) {
      confidence *= 1.1;
    } else if (listing.seller.totalSales < 100) {
      confidence *= 0.9;
    }

    return Math.min(1, Math.max(0, confidence));
  }

  private analyzePriceTrends(sales: CardListing[]): {
    trend: 'up' | 'down' | 'stable';
    momentum: number;
    volatility: number;
  } {
    if (sales.length < 2) {
      return { trend: 'stable', momentum: 0, volatility: 0 };
    }

    const prices = sales
      .sort((a, b) => a.endTime!.getTime() - b.endTime!.getTime())
      .map(s => s.price);

    const changes = prices.slice(1).map((price, i) => 
      (price - prices[i]) / prices[i]
    );

    const momentum = changes.reduce((sum, change) => sum + change, 0) / changes.length;
    const volatility = this.calculateStandardDeviation(changes);

    let trend: 'up' | 'down' | 'stable';
    if (Math.abs(momentum) < 0.02) {
      trend = 'stable';
    } else {
      trend = momentum > 0 ? 'up' : 'down';
    }

    return { trend, momentum, volatility };
  }

  private calculateAverage(numbers: number[]): number {
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }

  private calculateMedian(numbers: number[]): number {
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  private calculateQuantile(numbers: number[], q: number): number {
    const sorted = [...numbers].sort((a, b) => a - b);
    const pos = (sorted.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (sorted[base + 1] !== undefined) {
      return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
    } else {
      return sorted[base];
    }
  }

  private calculateStandardDeviation(numbers: number[]): number {
    const mean = this.calculateAverage(numbers);
    const squareDiffs = numbers.map(n => Math.pow(n - mean, 2));
    return Math.sqrt(this.calculateAverage(squareDiffs));
  }

  private calculatePriceChange(sales: CardListing[], days: number): number {
    const recentSales = this.filterRecentSales(sales, days);
    if (recentSales.length < 2) return 0;

    const oldestPrice = recentSales[recentSales.length - 1].price;
    const newestPrice = recentSales[0].price;
    return ((newestPrice - oldestPrice) / oldestPrice) * 100;
  }

  private calculateVolume(sales: CardListing[], days: number): number {
    return this.filterRecentSales(sales, days)
      .reduce((sum, sale) => sum + sale.price, 0);
  }
}

export const priceAnalyzer = PriceAnalyzer.getInstance();