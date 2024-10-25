import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Youtube, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useGoogleAuth } from '../hooks/useGoogleAuth';
import { Button } from './ui/Button';

export const YouTubeAuth: React.FC = () => {
  const { login, isLoading, error, isAuthenticated, user } = useGoogleAuth();
  const [isHovered, setIsHovered] = useState(false);

  if (isAuthenticated && user) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img 
              src={user.picture} 
              alt={user.name}
              className="w-12 h-12 rounded-full"
            />
            <div>
              <h3 className="font-semibold">{user.name}</h3>
              <p className="text-sm text-gray-400">{user.email}</p>
            </div>
            <div className="flex items-center gap-2 bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-sm">
              <CheckCircle className="w-4 h-4" />
              Connected
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              // Open in new tab
              window.open('https://studio.youtube.com', '_blank');
            }}
            className="flex items-center gap-2"
          >
            <Youtube className="w-4 h-4" />
            Open YouTube Studio
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700"
    >
      <div className="text-center space-y-4">
        <Youtube className="w-12 h-12 mx-auto text-red-500" />
        <div>
          <h3 className="text-lg font-semibold">Connect YouTube Account</h3>
          <p className="text-sm text-gray-400 mt-1">
            Link your YouTube account to enable automated uploads and analytics
          </p>
        </div>

        <motion.button
          onClick={login}
          disabled={isLoading}
          onHoverStart={() => setIsHovered(true)}
          onHoverEnd={() => setIsHovered(false)}
          className={`
            w-full flex items-center justify-center gap-3 px-6 py-3 
            bg-gradient-to-r from-red-500 to-red-600 
            hover:from-red-600 hover:to-red-700
            text-white rounded-lg font-medium
            transition-all duration-200 ease-in-out
            ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}
          `}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Youtube className="w-5 h-5" />
          )}
          <span>Connect with YouTube</span>
        </motion.button>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-2 text-sm text-red-400"
          >
            <XCircle className="w-4 h-4" />
            {error}
          </motion.div>
        )}

        <p className="text-xs text-gray-500">
          By connecting, you agree to YouTube's Terms of Service and Privacy Policy
        </p>
      </div>
    </motion.div>
  );
};