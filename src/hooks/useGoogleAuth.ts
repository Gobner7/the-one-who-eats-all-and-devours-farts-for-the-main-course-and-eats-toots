import { useState, useCallback } from 'react';

export const useGoogleAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const login = useCallback(async () => {
    const clientId = localStorage.getItem('google_client_id');
    const apiKey = localStorage.getItem('youtube_api_key');
    
    if (!clientId || !apiKey) {
      setError('Please add your Google credentials in Settings first');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // For preview, store demo data
      localStorage.setItem('user_data', JSON.stringify({
        name: "Demo User",
        email: "demo@example.com",
        picture: "https://ui-avatars.com/api/?name=Demo+User&background=random"
      }));
      
      setIsAuthenticated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    login,
    isLoading,
    error,
    isAuthenticated,
    user: JSON.parse(localStorage.getItem('user_data') || 'null')
  };
};