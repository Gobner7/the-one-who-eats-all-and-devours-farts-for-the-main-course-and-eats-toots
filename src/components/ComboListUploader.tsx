import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, AlertCircle, Play, Pause, XCircle } from 'lucide-react';
import { useSolverStore } from '../store/solverStore';
import { Button } from './ui/Button';
import { Progress } from './ui/Progress';

export const ComboListUploader: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const { stats, updateStats, setComboList, startSolving, stopSolving } = useSolverStore();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);

    try {
      const text = await file.text();
      const combos = text.split('\n')
        .map(line => line.trim())
        .filter(line => line.includes(':'));

      if (combos.length === 0) {
        throw new Error('No valid combo entries found in the file');
      }

      setComboList(combos);
      updateStats({ currentStatus: 'ready' });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to process file');
    }
  };

  const progress = stats.activeComboList.length > 0
    ? (stats.processedCount / stats.activeComboList.length) * 100
    : 0;

  return (
    <div className="space-y-6 bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700">
      <motion.div
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${error ? 'border-red-500/50 bg-red-500/5' : 'border-gray-700 hover:border-gray-600'}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <label className="cursor-pointer">
          <input
            type="file"
            accept=".txt"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Upload className={`w-8 h-8 mx-auto mb-4 ${error ? 'text-red-400' : 'text-gray-400'}`} />
          <p className="text-gray-300">
            Click to upload your combo list file
          </p>
          {stats.activeComboList.length > 0 && (
            <p className="text-sm text-gray-400 mt-2">
              {stats.activeComboList.length} entries loaded
            </p>
          )}
        </label>
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-4"
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </motion.div>
      )}

      {stats.activeComboList.length > 0 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-400">
              <span>Progress</span>
              <span>{`${stats.processedCount} / ${stats.activeComboList.length}`}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Status: {stats.currentStatus}</span>
              <span>{progress.toFixed(1)}% complete</span>
            </div>
            <Progress value={progress} />
          </div>

          <div className="flex gap-4">
            {stats.currentStatus !== 'running' ? (
              <Button 
                onClick={startSolving}
                className="flex-1 flex items-center justify-center gap-2"
                disabled={!!error}
              >
                <Play className="w-4 h-4" />
                Start Solver
              </Button>
            ) : (
              <Button 
                onClick={stopSolving}
                variant="destructive" 
                className="flex-1 flex items-center justify-center gap-2"
              >
                <Pause className="w-4 h-4" />
                Pause Solver
              </Button>
            )}
            <Button 
              onClick={() => setComboList([])}
              variant="outline"
              className="flex items-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              Clear List
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};