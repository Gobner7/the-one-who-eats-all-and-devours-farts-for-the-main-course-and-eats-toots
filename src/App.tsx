import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { DealFinder } from './components/DealFinder';
import { MTGDashboard } from './components/MTGDashboard';
import { Toaster } from 'react-hot-toast';
import { Coins, Layers, Settings } from 'lucide-react';

const queryClient = new QueryClient();

function MarketApp() {
  const [activeTab, setActiveTab] = React.useState<'deals' | 'mtg' | 'settings'>('deals');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <motion.header 
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600 mb-4">
            Card Market Analytics
          </h1>
          <p className="text-xl text-gray-400">Real-time market analysis and deal finding</p>
        </motion.header>

        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setActiveTab('deals')}
            className={`px-6 py-3 rounded-lg flex items-center gap-2 transition-colors ${
              activeTab === 'deals' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <Coins className="w-5 h-5" />
            Deal Finder
          </button>
          <button
            onClick={() => setActiveTab('mtg')}
            className={`px-6 py-3 rounded-lg flex items-center gap-2 transition-colors ${
              activeTab === 'mtg' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <Layers className="w-5 h-5" />
            MTG Analytics
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-6 py-3 rounded-lg flex items-center gap-2 transition-colors ${
              activeTab === 'settings' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <Settings className="w-5 h-5" />
            Settings
          </button>
        </div>

        {activeTab === 'deals' && <DealFinder />}
        {activeTab === 'mtg' && <MTGDashboard />}
        {activeTab === 'settings' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700"
          >
            <h2 className="text-xl font-bold mb-6">Settings</h2>
            {/* Add settings content */}
          </motion.div>
        )}
      </div>
      <Toaster position="bottom-right" />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MarketApp />
    </QueryClientProvider>
  );
}