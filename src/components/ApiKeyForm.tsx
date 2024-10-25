import React from 'react';
import { motion } from 'framer-motion';
import { Key, Save, Check } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { Button } from './ui/Button';

interface ApiKeyFormData {
  mtgGraphQLKey: string;
  mtgjsonKey: string;
}

export const ApiKeyForm: React.FC = () => {
  const { register, handleSubmit } = useForm<ApiKeyFormData>();
  const [isSaved, setIsSaved] = React.useState(false);

  const onSubmit = (data: ApiKeyFormData) => {
    try {
      localStorage.setItem('mtg_graphql_key', data.mtgGraphQLKey);
      localStorage.setItem('mtgjson_key', data.mtgjsonKey);
      setIsSaved(true);
      toast.success('API keys saved successfully');
      setTimeout(() => setIsSaved(false), 2000);
    } catch (error) {
      toast.error('Failed to save API keys');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700"
    >
      <div className="flex items-center gap-2 mb-6">
        <Key className="w-5 h-5 text-purple-400" />
        <h2 className="text-xl font-bold">API Configuration</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              MTG GraphQL API Key
            </label>
            <input
              type="password"
              {...register('mtgGraphQLKey')}
              className="w-full px-4 py-2 bg-gray-700/50 rounded-lg border border-gray-600 focus:border-purple-500"
              placeholder="Enter your MTG GraphQL API key..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              MTGJSON API Key
            </label>
            <input
              type="password"
              {...register('mtgjsonKey')}
              className="w-full px-4 py-2 bg-gray-700/50 rounded-lg border border-gray-600 focus:border-purple-500"
              placeholder="Enter your MTGJSON API key..."
            />
          </div>
        </div>

        <Button
          type="submit"
          className="w-full flex items-center justify-center gap-2"
        >
          {isSaved ? (
            <>
              <Check className="w-4 h-4" />
              Saved!
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save API Keys
            </>
          )}
        </Button>
      </form>
    </motion.div>
  );
};