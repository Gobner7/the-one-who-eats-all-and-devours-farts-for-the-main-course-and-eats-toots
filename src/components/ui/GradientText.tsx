import React from 'react';
import { motion } from 'framer-motion';

interface GradientTextProps {
  text: string;
  gradient: string;
  className?: string;
}

export const GradientText: React.FC<GradientTextProps> = ({ 
  text, 
  gradient = 'from-purple-400 via-pink-500 to-red-500',
  className = '' 
}) => {
  return (
    <motion.span
      className={`bg-gradient-to-r ${gradient} bg-clip-text text-transparent ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        damping: 12,
        stiffness: 200
      }}
    >
      {text}
    </motion.span>
  );
};