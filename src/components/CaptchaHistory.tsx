import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';

interface CaptchaEntry {
  id: string;
  timestamp: Date;
  success: boolean;
  solveTime: number;
  type: string;
}

export const CaptchaHistory: React.FC = () => {
  const [history] = React.useState<CaptchaEntry[]>([]);

  return (
    <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl border border-gray-700 overflow-hidden mt-8">
      <div className="p-6 border-b border-gray-700">
        <h2 className="text-xl font-bold">Solve History</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Time</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Type</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Status</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Solve Time</th>
            </tr>
          </thead>
          <tbody>
            {history.map((entry, index) => (
              <motion.tr
                key={entry.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="border-b border-gray-700"
              >
                <td className="px-6 py-4 text-gray-300">
                  {format(entry.timestamp, 'HH:mm:ss')}
                </td>
                <td className="px-6 py-4">{entry.type}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    {entry.success ? (
                      <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400 mr-2" />
                    )}
                    {entry.success ? 'Success' : 'Failed'}
                  </div>
                </td>
                <td className="px-6 py-4">
                  {(entry.solveTime / 1000).toFixed(2)}s
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};