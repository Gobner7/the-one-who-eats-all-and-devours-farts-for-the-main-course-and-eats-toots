import React from 'react';
import { motion } from 'framer-motion';
import { Search, TrendingUp, Package, DollarSign } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { mtgService } from '../services/api/mtg';
import { ApiKeyForm } from './ApiKeyForm';
import { PriceChart } from './PriceChart';
import { MarketStats } from './MarketStats';
import { MarketVolume } from './MarketVolume';
import { Button } from './ui/Button';

interface SearchForm {
  cardName: string;
  setCode?: string;
}

export const MTGDashboard: React.FC = () => {
  const [cardData, setCardData] = React.useState<any>(null);
  const [priceHistory, setPriceHistory] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const { register, handleSubmit } = useForm<SearchForm>();

  const onSubmit = async (data: SearchForm) => {
    try {
      setIsLoading(true);
      const [card, prices] = await Promise.all([
        mtgService.searchCards(data.cardName),
        mtgService.getCardPriceHistory(data.cardName)
      ]);

      setCardData(card[0]);
      setPriceHistory(prices);
      toast.success('Card data loaded successfully');
    } catch (error) {
      toast.error('Failed to load card data');
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <ApiKeyForm />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                Set Code (Optional)
              </label>
              <input
                type="text"
                {...register('setCode')}
                className="w-full px-4 py-2 bg-gray-700/50 rounded-lg border border-gray-600 focus:border-purple-500"
                placeholder="Enter set code..."
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            {isLoading ? 'Searching...' : 'Search Card'}
          </Button>
        </form>
      </motion.div>

      {cardData && (
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
                <h3 className="text-lg font-semibold">Price History</h3>
              </div>
            </div>
            <PriceChart data={priceHistory} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700"
          >
            <div className="flex items-center gap-2 mb-6">
              <Package className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-semibold">Card Details</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400">Name</label>
                <p className="font-medium">{cardData.name}</p>
              </div>
              <div>
                <label className="text-sm text-gray-400">Set</label>
                <p className="font-medium">{cardData.setCode}</p>
              </div>
              <div>
                <label className="text-sm text-gray-400">Type</label>
                <p className="font-medium">{cardData.type}</p>
              </div>
              <div>
                <label className="text-sm text-gray-400">Oracle Text</label>
                <p className="text-sm">{cardData.text}</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {priceHistory.length > 0 && (
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
          <MarketVolume data={priceHistory} />
        </motion.div>
      )}
    </div>
  );
};