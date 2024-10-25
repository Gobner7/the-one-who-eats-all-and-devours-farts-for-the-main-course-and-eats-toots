import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, AlertCircle, Play, Pause, Settings, TrendingUp, DollarSign, Package, RefreshCw } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { Deal, CardData } from '../types/market';
import { useDealStore } from '../store/dealStore';
import { DealList } from './DealList';
import { MarketStats } from './MarketStats';
import { PriceChart } from './PriceChart';
import { MarketVolume } from './MarketVolume';
import { Button } from './ui/Button';

interface SearchForm {
  cardName: string;
  type: CardData['type'];
  maxPrice: number;
  minDiscount: number;
  condition: string[];
}

export const DealFinder: React.FC = () => {
  const [isSearching, setIsSearching] = useState(false);
  const { register, handleSubmit } = useForm<SearchForm>();
  const { startScanning, stopScanning, deals, stats } = useDealStore();

  const onSubmit = async (data: SearchForm) => {
    try {
      setIsSearching(true);
      await startScanning(data);
      toast.success('Deal scanning started');
    } catch (error) {
      toast.error('Failed to start scanning');
      console.error('Scanning error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Card Name
              </label>
              <input
                type="text"
                {...register('cardName', { required: true })}
                className="w-full px-4 py-2 bg-gray-700/50 rounded-lg border border-gray-600 focus:border-purple-500"
                placeholder="Enter card name..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Card Type
              </label>
              <select
                {...register('type', { required: true })}
                className="w-full px-4 py-2 bg-gray-700/50 rounded-lg border border-gray-600 focus:border-purple-500"
              >
                <option value="pokemon">Pokémon</option>
                <option value="mtg">Magic: The Gathering</option>
                <option value="yugioh">Yu-Gi-Oh!</option>
                <option value="sports">Sports Cards</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Max Price
              </label>
              <input
                type="number"
                {...register('maxPrice', { min: 0 })}
                className="w-full px-4 py-2 bg-gray-700/50 rounded-lg border border-gray-600 focus:border-purple-500"
                placeholder="Enter max price..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Min Discount (%)
              </label>
              <input
                type="number"
                {...register('minDiscount', { min: 0, max: 100 })}
                className="w-full px-4 py-2 bg-gray-700/50 rounded-lg border border-gray-600 focus:border-purple-500"
                placeholder="Enter min discount..."
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button
              type="submit"
              disabled={isSearching}
              className="flex items-center gap-2"
            >
              {isSearching ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {isSearching ? 'Stop Scanning' : 'Start Scanning'}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Settings
            </Button>
          </div>
        </form>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-semibold">Market Overview</h3>
            </div>
            {isSearching && (
              <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />
            )}
          </div>
          <div className="space-y-6">
            <MarketStats stats={stats} />
            <PriceChart data={deals} />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-semibold">Live Deals</h3>
            </div>
            <span className="text-sm text-gray-400">
              {deals.length} found
            </span>
          </div>
          <DealList deals={deals} />
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700"
      >
        <div className="flex items-center gap-2 mb-6">
          <DollarSign className="w-5 h-5 text-green-400" />
          <h3 className="text-lg font-semibold">Market Volume</h3>
        </div>
        <MarketVolume data={deals} />
      </motion.div>
    </div>
  );
};