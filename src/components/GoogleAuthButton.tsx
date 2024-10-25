import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Youtube, Loader2 } from 'lucide-react';
import { useGoogleAuth } from '../hooks/useGoogleAuth';

export const GoogleAuthButton: React.FC = () => {
  const { login, isLoading, error } = useGoogleAuth();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.button
      onClick={login}
      disabled={isLoading}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={`
        relative w-full flex items-center justify-center gap-3 px-6 py-3 
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
      <span>Connect YouTube Account</span>
      
      {error && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -bottom-8 left-0 right-0 text-sm text-red-500"
        >
          {error}
        </motion.div>
      )}
    </motion.button>
  );
};