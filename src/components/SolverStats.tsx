import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Clock, CheckCircle, Activity, List } from 'lucide-react';
import { useSolverStats } from '../hooks/useSolverStats';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, description }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700"
  >
    <div className="flex justify-between items-start">
      <div>
        <p className="text-gray-400 text-sm">{title}</p>
        <p className="text-2xl font-bold mt-2">{value}</p>
        {description && (
          <p className="text-gray-400 text-sm mt-2">{description}</p>
        )}
      </div>
      <div className="p-3 bg-gray-700/50 rounded-lg">
        {icon}
      </div>
    </div>
  </motion.div>
);

export const SolverStats: React.FC = () => {
  const { data: stats, isLoading } = useSolverStats();

  if (isLoading || !stats) {
    return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700 animate-pulse">
          <div className="h-20"></div>
        </div>
      ))}
    </div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
      <StatsCard
        title="Total Solved"
        value={stats.totalSolved.toLocaleString()}
        icon={<Brain className="w-6 h-6 text-purple-400" />}
      />
      <StatsCard
        title="Success Rate"
        value={`${stats.successRate.toFixed(1)}%`}
        icon={<CheckCircle className="w-6 h-6 text-green-400" />}
      />
      <StatsCard
        title="Average Solve Time"
        value={`${(stats.averageSolveTime / 1000).toFixed(2)}s`}
        icon={<Clock className="w-6 h-6 text-blue-400" />}
      />
      <StatsCard
        title="Current Status"
        value={stats.currentStatus.charAt(0).toUpperCase() + stats.currentStatus.slice(1)}
        icon={<Activity className="w-6 h-6 text-orange-400" />}
        description={stats.isProcessing ? 'Processing combo list...' : ''}
      />
      <StatsCard
        title="Combo List"
        value={stats.activeComboList.length}
        icon={<List className="w-6 h-6 text-yellow-400" />}
        description={`${stats.processedCount} processed`}
      />
    </div>
  );
};