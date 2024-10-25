import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUp, ArrowDown, ImageOff } from 'lucide-react';
import { MarketItem } from '../types/market';

interface MarketTableProps {
  items: MarketItem[];
  onItemClick: (item: MarketItem) => void;
}

export const MarketTable: React.FC<MarketTableProps> = ({ items, onItemClick }) => {
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = `https://images.unsplash.com/photo-1633988354540-d3f4e97c7f90?w=64&h=64&fit=crop&auto=format`;
    e.currentTarget.onerror = null; // Prevent infinite loop
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl border border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Item</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Price</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Market</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Trend</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Last Update</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <motion.tr
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="border-b border-gray-700 hover:bg-gray-700/30 cursor-pointer"
                onClick={() => onItemClick(item)}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <div className="relative w-10 h-10 rounded overflow-hidden bg-gray-700/50">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          onError={handleImageError}
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageOff className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <span className="font-medium text-gray-200">{item.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-200">${item.price.toLocaleString()}</td>
                <td className="px-6 py-4 text-gray-200">{item.market}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-1">
                    {item.trend > 0 ? (
                      <ArrowUp className="w-4 h-4 text-green-400" />
                    ) : (
                      <ArrowDown className="w-4 h-4 text-red-400" />
                    )}
                    <span className={item.trend > 0 ? 'text-green-400' : 'text-red-400'}>
                      {Math.abs(item.trend)}%
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-400">
                  {new Date(item.lastUpdate).toLocaleTimeString()}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};