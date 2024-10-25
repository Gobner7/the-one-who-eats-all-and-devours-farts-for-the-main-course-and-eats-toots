import React from 'react';
import { motion } from 'framer-motion';
import { 
  Brain, 
  Shield, 
  Zap, 
  BarChart2,
  Clock,
  Activity,
  ArrowUp,
  ArrowDown,
  RotateCw,
  Grid,
  ImageOff
} from 'lucide-react';
import { useSolverStats } from '../hooks/useSolverStats';
import { LineChart } from './charts/LineChart';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: number;
  description?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, trend, description }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700 hover:border-purple-500/50 transition-colors"
  >
    <div className="flex justify-between items-start">
      <div>
        <p className="text-gray-400 text-sm">{title}</p>
        <p className="text-2xl font-bold mt-2">{value}</p>
        {trend !== undefined && (
          <div className="flex items-center mt-2">
            {trend >= 0 ? (
              <ArrowUp className="w-4 h-4 text-green-400 mr-1" />
            ) : (
              <ArrowDown className="w-4 h-4 text-red-400 mr-1" />
            )}
            <span className={trend >= 0 ? 'text-green-400' : 'text-red-400'}>
              {Math.abs(trend)}%
            </span>
          </div>
        )}
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

export const Dashboard: React.FC = () => {
  const { data: stats } = useSolverStats();

  const solveData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Solves',
        data: [156, 235, 198, 284, 267, 312, 358],
        borderColor: 'rgb(147, 51, 234)',
        tension: 0.3
      }
    ]
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Success Rate"
          value={`${((stats?.successRate || 0) * 100).toFixed(1)}%`}
          icon={<Brain className="w-6 h-6 text-purple-400" />}
          trend={5.2}
        />
        <StatsCard
          title="Average Solve Time"
          value={`${((stats?.averageSolveTime || 0) / 1000).toFixed(2)}s`}
          icon={<Clock className="w-6 h-6 text-blue-400" />}
          trend={-2.1}
        />
        <StatsCard
          title="Total Solved"
          value={stats?.totalSolved || 0}
          icon={<Shield className="w-6 h-6 text-green-400" />}
          trend={12.5}
        />
        <StatsCard
          title="Active Tasks"
          value={stats?.activeTasks || 0}
          icon={<Activity className="w-6 h-6 text-orange-400" />}
          description="Currently processing"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700"
        >
          <h2 className="text-xl font-bold mb-4">Solve Performance</h2>
          <div className="h-[300px]">
            <LineChart data={solveData} />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700"
        >
          <h2 className="text-xl font-bold mb-4">Challenge Types</h2>
          <div className="space-y-4">
            <div className="bg-gray-700/30 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <RotateCw className="w-5 h-5 text-purple-400" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Rotation</span>
                    <span className="text-sm text-gray-400">95% Success</span>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-2 mt-2">
                    <div className="bg-purple-500 rounded-full h-2" style={{ width: '95%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-700/30 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <Grid className="w-5 h-5 text-blue-400" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Tile Selection</span>
                    <span className="text-sm text-gray-400">92% Success</span>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-2 mt-2">
                    <div className="bg-blue-500 rounded-full h-2" style={{ width: '92%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-700/30 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <ImageOff className="w-5 h-5 text-green-400" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Image Matching</span>
                    <span className="text-sm text-gray-400">88% Success</span>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-2 mt-2">
                    <div className="bg-green-500 rounded-full h-2" style={{ width: '88%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};