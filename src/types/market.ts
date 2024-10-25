export interface CardListing {
  id: string;
  title: string;
  price: number;
  shipping: number;
  condition: string;
  seller: {
    id: string;
    name: string;
    rating: number;
    totalSales: number;
  };
  platform: 'ebay' | 'tcgplayer' | 'cardmarket';
  imageUrl: string;
  url: string;
  endTime?: Date;
  isAuction: boolean;
  bids?: number;
  lastUpdated: Date;
}

export interface CardData {
  id: string;
  name: string;
  set: string;
  number?: string;
  rarity: string;
  type: 'pokemon' | 'mtg' | 'yugioh' | 'sports';
  subtype?: string;
  imageUrl?: string;
  marketPrice: number;
  priceHistory: PricePoint[];
  listings: CardListing[];
}

export interface PricePoint {
  date: Date;
  price: number;
  volume?: number;
}

export interface Deal {
  id: string;
  card: CardData;
  listing: CardListing;
  marketPrice: number;
  discount: number;
  profitPotential: number;
  confidence: number;
  timestamp: Date;
}

export interface MarketStats {
  totalListings: number;
  averagePrice: number;
  lowestPrice: number;
  highestPrice: number;
  recentSales: number;
  priceChange24h: number;
  volume24h: number;
}