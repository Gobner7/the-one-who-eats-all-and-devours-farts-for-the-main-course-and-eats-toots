import { useQuery } from '@tanstack/react-query';
import { useSolverStore } from '../store/solverStore';

export function useSolverStats() {
  const stats = useSolverStore((state) => state.stats);
  const status = useSolverStore((state) => state.status);

  return useQuery({
    queryKey: ['solver-stats', status],
    queryFn: async () => stats,
    refetchInterval: status === 'running' ? 1000 : false,
  });
}