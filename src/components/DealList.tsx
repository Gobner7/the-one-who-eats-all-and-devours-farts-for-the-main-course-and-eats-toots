import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, TrendingUp, TrendingDown, DollarSign, Star } from 'lucide-react';
import { Deal } from '../types/market';
import { format } from 'date-fns';

interface DealListProps {
  deals: Deal[];
}

export const DealList: React.FC<DealListProps> = ({ deals }) => {
  return (
    <div className="space-y-4">
      {deals.length === 0 ? (
        <div className="text-center text-gray-400 py-8">
          <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No deals found yet. Start scanning to find opportunities!</p>
        </div>
      ) : (
        deals.map((deal, index) => (
          <motion.div
            key={deal.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-gray-700/30 rounded-lg p-4 hover:bg-gray-700/50 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 rounded overflow-hidden bg-gray-600">
                  <img
                    src={deal.listing.imageUrl}
                    alt={deal.listing.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = 'https://via.placeholder.com/64';
                    }}
                  />
                </div>
                <div>
                  <h3 className="font-medium text-sm">{deal.listing.title}</h3>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-xl font-bold">
                      ${deal.listing.price.toFixed(2)}
                    </span>
                    <div className="flex items-center gap-1 text-sm">
                      {deal.discount >= 0 ? (
                        <TrendingDown className="w-4 h-4 text-green-400" />
                      ) : (
                        <TrendingUp className="w-4 h-4 text-red-400" />
                      )}
                      <span className={deal.discount >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {Math.abs(deal.discount).toFixed(1)}% vs market
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4" />
                      {deal.listing.condition}
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      Potential profit: ${deal.profitPotential.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <a
                  href={deal.listing.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
                <span className="text-xs text-gray-400">
                  {format(deal.timestamp, 'HH:mm:ss')}
                </span>
              </div>
            </div>
          </motion.div>
        ))
      )}
    </div>
  );
};