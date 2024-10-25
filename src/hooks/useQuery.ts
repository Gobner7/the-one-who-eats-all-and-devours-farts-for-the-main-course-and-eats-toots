import { useQuery as useReactQuery, UseQueryOptions } from '@tanstack/react-query';
import { serializeError } from '../services/api';

export function useQuery<T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  options?: Omit<UseQueryOptions<T, Error>, 'queryKey' | 'queryFn'>
) {
  return useReactQuery({
    queryKey,
    queryFn,
    ...options,
    onError: (error) => {
      const serializedError = serializeError(error);
      console.error('Query Error:', serializedError);
      options?.onError?.(error);
    }
  });
}