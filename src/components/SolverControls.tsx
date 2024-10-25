import React from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Settings, RefreshCw, Save } from 'lucide-react';
import { Button } from './ui/Button';
import { useSolverStore } from '../store/solverStore';

export const SolverControls: React.FC = () => {
  const { 
    isProcessing,
    startSolving,
    stopSolving,
    stats,
    saveSettings
  } = useSolverStore();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Solver Controls</h2>
        <div className="flex gap-2">
          {isProcessing ? (
            <Button
              onClick={stopSolving}
              variant="destructive"
              className="flex items-center gap-2"
            >
              <Pause className="w-4 h-4" />
              Stop Processing
            </Button>
          ) : (
            <Button
              onClick={startSolving}
              className="flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Start Processing
            </Button>
          )}
          <Button
            variant="outline"
            onClick={saveSettings}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Settings
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-700/30 rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
            <RefreshCw className="w-4 h-4" />
            Processing Speed
          </div>
          <select
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2"
            value={stats.processingSpeed}
            onChange={(e) => useSolverStore.setState({
              stats: { ...stats, processingSpeed: e.target.value }
            })}
          >
            <option value="slow">Slow (Human-like)</option>
            <option value="medium">Medium</option>
            <option value="fast">Fast</option>
          </select>
        </div>

        <div className="bg-gray-700/30 rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
            <Settings className="w-4 h-4" />
            Proxy Settings
          </div>
          <select
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2"
            value={stats.proxyMode}
            onChange={(e) => useSolverStore.setState({
              stats: { ...stats, proxyMode: e.target.value }
            })}
          >
            <option value="none">No Proxy</option>
            <option value="rotating">Rotating Proxies</option>
            <option value="static">Static Proxy</option>
          </select>
        </div>

        <div className="bg-gray-700/30 rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
            <Settings className="w-4 h-4" />
            Solver Mode
          </div>
          <select
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2"
            value={stats.solverMode}
            onChange={(e) => useSolverStore.setState({
              stats: { ...stats, solverMode: e.target.value }
            })}
          >
            <option value="accurate">High Accuracy</option>
            <option value="balanced">Balanced</option>
            <option value="fast">High Speed</option>
          </select>
        </div>
      </div>
    </motion.div>
  );
};