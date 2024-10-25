import { create } from 'zustand';
import { marketScraper } from '../services/api/scraper';
import { marketAnalyzer } from '../services/api/market-analyzer';
import { Deal, MarketStats, CardData } from '../types/market';

interface DealStore {
  deals: Deal[];
  stats: MarketStats;
  isScanning: boolean;
  scanInterval: number | null;
  searchParams: {
    cardName: string;
    type: CardData['type'];
    maxPrice: number;
    minDiscount: number;
  } | null;
  startScanning: (params: {
    cardName: string;
    type: CardData['type'];
    maxPrice: number;
    minDiscount: number;
  }) => Promise<void>;
  stopScanning: () => void;
  addDeal: (deal: Deal) => void;
  updateStats: (newStats: Partial<MarketStats>) => void;
  clearDeals: () => void;
}

export const useDealStore = create<DealStore>((set, get) => ({
  deals: [],
  stats: {
    totalListings: 0,
    averagePrice: 0,
    lowestPrice: 0,
    highestPrice: 0,
    recentSales: 0,
    priceChange24h: 0,
    volume24h: 0
  },
  isScanning: false,
  scanInterval: null,
  searchParams: null,

  startScanning: async (params) => {
    const store = get();
    if (store.isScanning) {
      store.stopScanning();
    }

    set({ searchParams: params, isScanning: true });

    const scanForDeals = async () => {
      try {
        // Get current listings
        const listings = await marketScraper.searchEbay(params.cardName);
        
        // Get completed sales for market price calculation
        const recentSales = await marketScraper.getCompletedSales(params.cardName);
        
        // Calculate market price
        const marketPrice = await marketAnalyzer.calculateMarketPrice(recentSales);
        
        // Get card details from appropriate API
        const cardDetails = await marketScraper.getCardDetails(params.cardName, params.type);
        
        // Find deals
        const newDeals = await marketAnalyzer.findDeals(listings, marketPrice, recentSales);
        
        // Filter deals based on parameters
        const filteredDeals = newDeals.filter(deal => {
          const totalPrice = deal.listing.price + deal.listing.shipping;
          return totalPrice <= params.maxPrice && 
                 deal.discount >= params.minDiscount;
        });

        // Update stats
        const newStats: MarketStats = {
          totalListings: listings.length,
          averagePrice: listings.reduce((sum, l) => sum + l.price, 0) / listings.length,
          lowestPrice: Math.min(...listings.map(l => l.price)),
          highestPrice: Math.max(...listings.map(l => l.price)),
          recentSales: recentSales.length,
          priceChange24h: calculatePriceChange(recentSales),
          volume24h: calculateVolume(recentSales)
        };

        // Update store
        set(state => ({
          deals: [...filteredDeals, ...state.deals].slice(0, 100), // Keep last 100 deals
          stats: newStats
        }));

      } catch (error) {
        console.error('Scanning error:', error);
      }
    };

    // Initial scan
    await scanForDeals();

    // Set up interval for continuous scanning
    const interval = window.setInterval(scanForDeals, 30000); // Scan every 30 seconds
    set({ scanInterval: interval });
  },

  stopScanning: () => {
    const { scanInterval } = get();
    if (scanInterval) {
      clearInterval(scanInterval);
    }
    set({ isScanning: false, scanInterval: null });
  },

  addDeal: (deal) => {
    set(state => ({
      deals: [deal, ...state.deals].slice(0, 100)
    }));
  },

  updateStats: (newStats) => {
    set(state => ({
      stats: { ...state.stats, ...newStats }
    }));
  },

  clearDeals: () => {
    set({ deals: [] });
  }
}));

function calculatePriceChange(recentSales: CardData['listings']): number {
  if (recentSales.length < 2) return 0;

  const last24h = recentSales.filter(sale => 
    (Date.now() - new Date(sale.lastUpdated).getTime()) <= 24 * 60 * 60 * 1000
  );

  if (last24h.length < 2) return 0;

  const oldestPrice = last24h[last24h.length - 1].price;
  const newestPrice = last24h[0].price;

  return ((newestPrice - oldestPrice) / oldestPrice) * 100;
}

function calculateVolume(recentSales: CardData['listings']): number {
  return recentSales
    .filter(sale => 
      (Date.now() - new Date(sale.lastUpdated).getTime()) <= 24 * 60 * 60 * 1000
    )
    .reduce((sum, sale) => sum + sale.price, 0);
}