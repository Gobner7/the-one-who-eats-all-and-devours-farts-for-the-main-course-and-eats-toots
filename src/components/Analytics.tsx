import React from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  BarChart2, 
  Clock, 
  Activity, 
  Youtube, 
  Share2, 
  Users,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface AnalyticsCardProps {
  title: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
  description?: string;
}

const AnalyticsCard: React.FC<AnalyticsCardProps> = ({
  title,
  value,
  change,
  icon,
  description
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700"
  >
    <div className="flex justify-between items-start">
      <div>
        <p className="text-gray-400 text-sm">{title}</p>
        <p className="text-2xl font-bold mt-2">{value}</p>
        <div className="flex items-center mt-2">
          {change >= 0 ? (
            <ArrowUpRight className="w-4 h-4 text-green-400 mr-1" />
          ) : (
            <ArrowDownRight className="w-4 h-4 text-red-400 mr-1" />
          )}
          <span className={change >= 0 ? 'text-green-400' : 'text-red-400'}>
            {Math.abs(change)}%
          </span>
        </div>
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

const ViewsChart: React.FC<{ data: any }> = ({ data }) => {
  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700">
      <h3 className="text-lg font-semibold mb-4">Views Over Time</h3>
      <Line data={data} options={options} />
    </div>
  );
};

const EngagementChart: React.FC<{ data: any }> = ({ data }) => {
  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700">
      <h3 className="text-lg font-semibold mb-4">Engagement Metrics</h3>
      <Bar data={data} options={options} />
    </div>
  );
};

export const Analytics: React.FC = () => {
  const viewsData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Views',
        data: [12000, 19000, 15000, 25000, 22000, 30000, 35000],
        fill: true,
        backgroundColor: 'rgba(147, 51, 234, 0.1)',
        borderColor: 'rgba(147, 51, 234, 1)',
        tension: 0.4,
      }
    ]
  };

  const engagementData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Likes',
        data: [1200, 1900, 1500, 2500, 2200, 3000, 3500],
        backgroundColor: 'rgba(147, 51, 234, 0.8)',
      },
      {
        label: 'Comments',
        data: [600, 800, 750, 1000, 1100, 1300, 1500],
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
      }
    ]
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AnalyticsCard
          title="Total Views"
          value="158.2K"
          change={12.5}
          icon={<Activity className="w-6 h-6 text-purple-400" />}
        />
        <AnalyticsCard
          title="Revenue"
          value="$1,245.89"
          change={8.2}
          icon={<DollarSign className="w-6 h-6 text-green-400" />}
        />
        <AnalyticsCard
          title="Subscribers"
          value="12.5K"
          change={15.8}
          icon={<Users className="w-6 h-6 text-blue-400" />}
        />
        <AnalyticsCard
          title="Upload Rate"
          value="3.2/day"
          change={-2.1}
          icon={<TrendingUp className="w-6 h-6 text-orange-400" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ViewsChart data={viewsData} />
        <EngagementChart data={engagementData} />
      </div>

      <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold mb-4">Performance Insights</h3>
        <div className="space-y-4">
          <div className="flex items-center text-green-400">
            <ArrowUpRight className="w-5 h-5 mr-2" />
            <span>Your morning uploads are performing 25% better than evening uploads</span>
          </div>
          <div className="flex items-center text-purple-400">
            <TrendingUp className="w-5 h-5 mr-2" />
            <span>Gaming content is trending in your target demographic</span>
          </div>
          <div className="flex items-center text-blue-400">
            <Share2 className="w-5 h-5 mr-2" />
            <span>Cross-platform sharing has increased your reach by 45%</span>
          </div>
        </div>
      </div>
    </div>
  );
};