import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Deal } from '../types/market';
import { subHours, format } from 'date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface MarketVolumeProps {
  data: Deal[];
}

export const MarketVolume: React.FC<MarketVolumeProps> = ({ data }) => {
  // Group deals by hour
  const hourlyVolume = new Map<string, number>();
  const now = new Date();

  // Initialize last 24 hours
  for (let i = 23; i >= 0; i--) {
    const hour = subHours(now, i);
    hourlyVolume.set(format(hour, 'HH:00'), 0);
  }

  // Calculate volume for each hour
  data.forEach(deal => {
    const hour = format(new Date(deal.timestamp), 'HH:00');
    if (hourlyVolume.has(hour)) {
      hourlyVolume.set(hour, (hourlyVolume.get(hour) || 0) + deal.listing.price);
    }
  });

  const chartData = {
    labels: Array.from(hourlyVolume.keys()),
    datasets: [
      {
        label: 'Trading Volume ($)',
        data: Array.from(hourlyVolume.values()),
        backgroundColor: 'rgba(34, 197, 94, 0.5)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 1
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: 'rgb(156, 163, 175)'
        }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        callbacks: {
          label: (context: any) => {
            return `Volume: $${context.raw.toLocaleString()}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: 'rgb(156, 163, 175)',
          maxRotation: 45
        }
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: 'rgb(156, 163, 175)',
          callback: (value: number) => `$${value.toLocaleString()}`
        }
      }
    }
  };

  return (
    <div className="h-[300px]">
      <Bar data={chartData} options={options} />
    </div>
  );
};