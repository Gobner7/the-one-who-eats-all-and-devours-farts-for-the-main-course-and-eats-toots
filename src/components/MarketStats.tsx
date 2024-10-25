import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, BarChart2, DollarSign } from 'lucide-react';
import { MarketStats as MarketStatsType } from '../types/market';

interface MarketStatsProps {
  stats: MarketStatsType;
}

export const MarketStats: React.FC<MarketStatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-700/30 rounded-lg p-4"
      >
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
          <BarChart2 className="w-4 h-4" />
          Total Listings
        </div>
        <div className="text-2xl font-bold">
          {stats.totalListings.toLocaleString()}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gray-700/30 rounded-lg p-4"
      >
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
          <DollarSign className="w-4 h-4" />
          Average Price
        </div>
        <div className="text-2xl font-bold">
          ${stats.averagePrice.toFixed(2)}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gray-700/30 rounded-lg p-4 col-span-2"
      >
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
          {stats.priceChange24h >= 0 ? (
            <TrendingUp className="w-4 h-4 text-green-400" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-400" />
          )}
          24h Price Change
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold">
            {Math.abs(stats.priceChange24h).toFixed(1)}%
          </span>
          <span className={stats.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'}>
            {stats.priceChange24h >= 0 ? 'increase' : 'decrease'}
          </span>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-gray-700/30 rounded-lg p-4 col-span-2"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-400 mb-1">24h Volume</div>
            <div className="text-xl font-bold">
              ${stats.volume24h.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-400 mb-1">Recent Sales</div>
            <div className="text-xl font-bold">
              {stats.recentSales.toLocaleString()}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};