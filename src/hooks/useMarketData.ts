import { useQuery } from 'react-query';
import { marketAPI } from '../services/api/markets';
import { MarketItem, ArbitrageOpportunity } from '../types/market';

export const useMarketData = (itemName: string) => {
  return useQuery<MarketItem>(['market', itemName], async () => {
    const steamPrice = await marketAPI.getSteamPrice(itemName);
    const buffPrice = await marketAPI.getBuffPrice(itemName);
    const skinportPrice = await marketAPI.getSkinportPrice(itemName);

    return {
      id: itemName,
      name: itemName,
      steamPrice,
      buffPrice,
      skinportPrice,
      lastUpdate: new Date().toISOString()
    };
  }, {
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

export const useArbitrageOpportunities = () => {
  return useQuery<ArbitrageOpportunity[]>('arbitrage', async () => {
    return marketAPI.findArbitrageOpportunities();
  }, {
    refetchInterval: 60000, // Refetch every minute
  });
};