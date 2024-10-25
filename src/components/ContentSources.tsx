import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Youtube, 
  Instagram,
  Search,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Settings,
  ExternalLink
} from 'lucide-react';

interface Source {
  id: string;
  type: 'youtube' | 'instagram';
  url: string;
  status: 'active' | 'error' | 'pending';
  lastSync: Date;
  videoCount: number;
}

export const ContentSources: React.FC = () => {
  const [sources, setSources] = useState<Source[]>([
    {
      id: '1',
      type: 'youtube',
      url: 'https://youtube.com/trending',
      status: 'active',
      lastSync: new Date(),
      videoCount: 156
    },
    {
      id: '2',
      type: 'instagram',
      url: 'https://instagram.com/explore',
      status: 'active',
      lastSync: new Date(),
      videoCount: 89
    }
  ]);

  const [newSourceUrl, setNewSourceUrl] = useState('');

  const handleAddSource = () => {
    if (!newSourceUrl) return;

    const newSource: Source = {
      id: Date.now().toString(),
      type: newSourceUrl.includes('youtube') ? 'youtube' : 'instagram',
      url: newSourceUrl,
      status: 'pending',
      lastSync: new Date(),
      videoCount: 0
    };

    setSources([...sources, newSource]);
    setNewSourceUrl('');
  };

  const handleRemoveSource = (id: string) => {
    setSources(sources.filter(source => source.id !== id));
  };

  const handleRefreshSource = (id: string) => {
    setSources(sources.map(source => 
      source.id === id 
        ? { ...source, status: 'pending', lastSync: new Date() }
        : source
    ));
  };

  return (
    <div className="space-y-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700"
      >
        <h2 className="text-xl font-bold mb-4">Content Sources</h2>
        
        <div className="flex gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              value={newSourceUrl}
              onChange={(e) => setNewSourceUrl(e.target.value)}
              placeholder="Enter YouTube or Instagram URL"
              className="w-full px-4 py-2 bg-gray-700/50 rounded-lg border border-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-colors"
            />
          </div>
          <button
            onClick={handleAddSource}
            disabled={!newSourceUrl}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Source
          </button>
        </div>

        <div className="space-y-4">
          {sources.map(source => (
            <motion.div
              key={source.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-gray-700/30 rounded-lg p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                {source.type === 'youtube' ? (
                  <Youtube className="w-6 h-6 text-red-500" />
                ) : (
                  <Instagram className="w-6 h-6 text-pink-500" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{source.url}</span>
                    <ExternalLink 
                      className="w-4 h-4 text-gray-400 hover:text-white cursor-pointer" 
                      onClick={() => window.open(source.url, '_blank')}
                    />
                  </div>
                  <div className="text-sm text-gray-400 flex items-center gap-4 mt-1">
                    <span>{source.videoCount} videos</span>
                    <span>Last sync: {source.lastSync.toLocaleTimeString()}</span>
                    <div className="flex items-center gap-1">
                      {source.status === 'active' && <CheckCircle className="w-4 h-4 text-green-400" />}
                      {source.status === 'error' && <XCircle className="w-4 h-4 text-red-400" />}
                      {source.status === 'pending' && <RefreshCw className="w-4 h-4 text-yellow-400 animate-spin" />}
                      <span>{source.status}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleRefreshSource(source.id)}
                  className="p-2 hover:bg-gray-600 rounded-lg transition-colors"
                  title="Refresh source"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleRemoveSource(source.id)}
                  className="p-2 hover:bg-gray-600 rounded-lg transition-colors"
                  title="Remove source"
                >
                  <Trash2 className="w-5 h-5 text-red-400" />
                </button>
                <button
                  className="p-2 hover:bg-gray-600 rounded-lg transition-colors"
                  title="Source settings"
                >
                  <Settings className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700"
      >
        <h3 className="text-lg font-semibold mb-4">Source Analytics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-700/30 rounded-lg p-4">
            <div className="text-sm text-gray-400">Total Videos</div>
            <div className="text-2xl font-bold mt-1">
              {sources.reduce((sum, source) => sum + source.videoCount, 0)}
            </div>
          </div>
          <div className="bg-gray-700/30 rounded-lg p-4">
            <div className="text-sm text-gray-400">Active Sources</div>
            <div className="text-2xl font-bold mt-1">
              {sources.filter(source => source.status === 'active').length}
            </div>
          </div>
          <div className="bg-gray-700/30 rounded-lg p-4">
            <div className="text-sm text-gray-400">Sync Rate</div>
            <div className="text-2xl font-bold mt-1">
              {(sources.length * 24).toFixed(1)}/day
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};