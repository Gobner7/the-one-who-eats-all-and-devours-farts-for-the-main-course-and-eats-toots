import React from 'react';
import { motion } from 'framer-motion';
import { 
  List, 
  Play, 
  Pause, 
  XCircle, 
  Youtube, 
  Share2, 
  TrendingUp,
  AlertCircle,
  BarChart2,
  Clock,
  Instagram
} from 'lucide-react';
import { useVideoQueue } from '../hooks/useVideoQueue';
import { Button } from './ui/Button';
import { Progress } from './ui/Progress';

export const VideoQueue: React.FC = () => {
  const { 
    queue, 
    isProcessing, 
    progress, 
    stats,
    startProcessing,
    stopProcessing,
    clearQueue 
  } = useVideoQueue();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <List className="w-5 h-5" />
          <span className="font-medium">Processing Queue</span>
          <span className="text-sm text-gray-400">({queue.length} videos)</span>
        </div>
        <div className="flex gap-2">
          {isProcessing ? (
            <Button
              onClick={stopProcessing}
              variant="destructive"
              className="flex items-center gap-2"
            >
              <Pause className="w-4 h-4" />
              Stop Processing
            </Button>
          ) : (
            <Button
              onClick={startProcessing}
              disabled={queue.length === 0}
              className="flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Start Processing
            </Button>
          )}
          <Button
            onClick={clearQueue}
            variant="outline"
            className="flex items-center gap-2"
          >
            <XCircle className="w-4 h-4" />
            Clear Queue
          </Button>
        </div>
      </div>

      {queue.length > 0 ? (
        <div className="space-y-4">
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-400">
                <span>Progress</span>
                <span>{progress.toFixed(1)}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-700/30 rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                <BarChart2 className="w-4 h-4" />
                Viral Score
              </div>
              <div className="text-2xl font-bold">{stats.averageViralScore.toFixed(1)}</div>
            </div>
            <div className="bg-gray-700/30 rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                <TrendingUp className="w-4 h-4" />
                Est. Daily Views
              </div>
              <div className="text-2xl font-bold">{stats.estimatedDailyViews.toLocaleString()}</div>
            </div>
            <div className="bg-gray-700/30 rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                <Clock className="w-4 h-4" />
                Uploads/Day
              </div>
              <div className="text-2xl font-bold">{stats.uploadsPerDay}</div>
            </div>
          </div>

          <div className="space-y-2">
            {queue.map((video, index) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-gray-700/30 rounded-lg p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative w-16 h-16 rounded overflow-hidden bg-gray-600">
                      {video.thumbnail ? (
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <AlertCircle className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium">{video.title}</h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-4 h-4" />
                          {video.viralScore.toFixed(1)}
                        </div>
                        <div className="flex items-center gap-1">
                          <BarChart2 className="w-4 h-4" />
                          {video.estimatedViews.toLocaleString()} views
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {video.platforms.includes('youtube') && (
                      <Youtube className="w-5 h-5 text-red-400" />
                    )}
                    {video.platforms.includes('instagram') && (
                      <Instagram className="w-5 h-5 text-pink-400" />
                    )}
                    <Share2 className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-400">
          <List className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No videos in queue</p>
          <p className="text-sm mt-1">Add videos to start processing</p>
        </div>
      )}
    </div>
  );
};