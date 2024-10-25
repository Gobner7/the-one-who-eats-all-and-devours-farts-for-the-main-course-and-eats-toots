import { useSolverStore } from '../store/solverStore';

export function useComboList() {
  const setComboList = useSolverStore((state) => state.setComboList);

  const uploadComboList = async (file: File) => {
    try {
      const text = await file.text();
      const lines = text.split('\n')
        .map(line => line.trim())
        .filter(line => line && line.includes(':'));
      
      if (lines.length === 0) {
        throw new Error('No valid entries found in combo list');
      }

      setComboList(lines);
    } catch (error) {
      console.error('Failed to process combo list:', error);
      throw error;
    }
  };

  return { uploadComboList };
}