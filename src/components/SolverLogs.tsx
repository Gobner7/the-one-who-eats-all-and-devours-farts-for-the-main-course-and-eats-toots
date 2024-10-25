import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { AlertCircle, CheckCircle, XCircle, Clock, Trash2, Brain, Shield, ImageOff } from 'lucide-react';
import { useSolverStore } from '../store/solverStore';

const LogIcon = ({ type, confidence }: { type: string; confidence?: number }) => {
  switch (type) {
    case 'success':
      return <CheckCircle className="w-5 h-5 text-green-400" />;
    case 'error':
      return <XCircle className="w-5 h-5 text-red-400" />;
    case 'warning':
      return <AlertCircle className="w-5 h-5 text-yellow-400" />;
    case 'info':
      return <Clock className="w-5 h-5 text-blue-400" />;
    default:
      return confidence && confidence > 0.8 
        ? <Brain className="w-5 h-5 text-purple-400" />
        : <Shield className="w-5 h-5 text-orange-400" />;
  }
};

interface CaptchaImage {
  url: string;
  type: string;
}

const CaptchaPreview = ({ image }: { image?: CaptchaImage }) => {
  const [error, setError] = React.useState(false);

  if (!image?.url || error) {
    return (
      <div className="w-10 h-10 bg-gray-700/50 rounded flex items-center justify-center">
        <ImageOff className="w-4 h-4 text-gray-400" />
      </div>
    );
  }

  return (
    <img
      src={image.url}
      alt={`Captcha ${image.type}`}
      className="w-10 h-10 rounded object-cover bg-gray-700/50"
      onError={() => setError(true)}
      loading="lazy"
    />
  );
};

export const SolverLogs: React.FC = () => {
  const logs = useSolverStore((state) => state.logs);
  const clearLogs = useSolverStore((state) => state.clearLogs);
  const [page, setPage] = React.useState(1);
  const logsPerPage = 10;

  const paginatedLogs = React.useMemo(() => {
    const start = (page - 1) * logsPerPage;
    return logs.slice(start, start + logsPerPage);
  }, [logs, page]);

  const totalPages = Math.ceil(logs.length / logsPerPage);

  return (
    <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl border border-gray-700 overflow-hidden">
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Solver Logs
        </h2>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">{logs.length} entries</span>
          {logs.length > 0 && (
            <button
              onClick={clearLogs}
              className="p-1 hover:bg-gray-700/50 rounded-lg transition-colors"
              title="Clear logs"
            >
              <Trash2 className="w-5 h-5 text-gray-400" />
            </button>
          )}
        </div>
      </div>
      <div className="h-[400px] overflow-y-auto">
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            No logs available
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {paginatedLogs.map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="border-b border-gray-700 hover:bg-gray-700/30 transition-colors"
              >
                <div className="px-4 py-3 flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <LogIcon type={log.type} confidence={log.confidence} />
                  </div>
                  {log.captchaImage && (
                    <div className="flex-shrink-0">
                      <CaptchaPreview image={log.captchaImage} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-200">{log.message}</span>
                      <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                        {format(new Date(log.timestamp), 'HH:mm:ss')}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 mt-1">
                      {log.solveTime && (
                        <span className="text-xs text-gray-400">
                          Solve time: {(log.solveTime / 1000).toFixed(2)}s
                        </span>
                      )}
                      {log.confidence && (
                        <span className="text-xs text-gray-400">
                          Confidence: {(log.confidence * 100).toFixed(1)}%
                        </span>
                      )}
                    </div>
                    {log.details && (
                      <p className="text-sm text-gray-400 mt-1 break-words">{log.details}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
      {totalPages > 1 && (
        <div className="p-4 border-t border-gray-700 flex items-center justify-between">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 rounded-lg bg-gray-700/50 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-400">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 rounded-lg bg-gray-700/50 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};