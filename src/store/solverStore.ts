import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { browserFunCaptchaSolver } from '../services/funcaptcha/browser-solver';

interface SolverLog {
  id: string;
  timestamp: Date;
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
  details?: string;
  solveTime?: number;
  confidence?: number;
  captchaImage?: {
    url: string;
    type: string;
  };
}

interface SolverState {
  status: 'idle' | 'running' | 'error';
  stats: {
    totalSolved: number;
    successRate: number;
    averageSolveTime: number;
    currentStatus: string;
    activeComboList: string[];
    processedCount: number;
    successfulLogins: number;
    failedLogins: number;
    lastSolveTime?: number;
    totalAttempts: number;
  };
  logs: SolverLog[];
  updateStats: (newStats: Partial<SolverState['stats']>) => void;
  addLog: (log: Omit<SolverLog, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;
  incrementProcessedCount: () => void;
  setComboList: (list: string[]) => void;
  startSolving: () => Promise<void>;
  stopSolving: () => void;
}

export const useSolverStore = create<SolverState>((set, get) => ({
  status: 'idle',
  stats: {
    totalSolved: 0,
    successRate: 0,
    averageSolveTime: 0,
    currentStatus: 'idle',
    activeComboList: [],
    processedCount: 0,
    successfulLogins: 0,
    failedLogins: 0,
    totalAttempts: 0
  },
  logs: [],
  updateStats: (newStats) => set((state) => ({
    stats: {
      ...state.stats,
      ...newStats,
      successRate: state.stats.totalAttempts > 0
        ? (state.stats.successfulLogins / state.stats.totalAttempts) * 100
        : 0
    }
  })),
  addLog: (log) => set((state) => ({
    logs: [
      {
        id: uuidv4(),
        timestamp: new Date(),
        ...log
      },
      ...state.logs.slice(0, 999)
    ]
  })),
  clearLogs: () => set({ logs: [] }),
  incrementProcessedCount: () => set((state) => ({
    stats: {
      ...state.stats,
      processedCount: state.stats.processedCount + 1,
      totalAttempts: state.stats.totalAttempts + 1
    }
  })),
  setComboList: (list) => set((state) => ({
    stats: {
      ...state.stats,
      activeComboList: list,
      processedCount: 0,
      totalAttempts: 0,
      successfulLogins: 0,
      failedLogins: 0
    }
  })),
  startSolving: async () => {
    const state = get();
    if (state.status === 'running') return;

    set({ status: 'running' });
    set(state => ({ 
      stats: { 
        ...state.stats,
        currentStatus: 'running'
      }
    }));

    try {
      await browserFunCaptchaSolver.startProcessing(state.stats.activeComboList);
    } catch (error) {
      set({ status: 'error' });
      set(state => ({ 
        stats: { 
          ...state.stats,
          currentStatus: 'error'
        }
      }));
    }
  },
  stopSolving: () => {
    browserFunCaptchaSolver.stopProcessing();
    set({ status: 'idle' });
    set(state => ({ 
      stats: { 
        ...state.stats,
        currentStatus: 'idle'
      }
    }));
  }
}));