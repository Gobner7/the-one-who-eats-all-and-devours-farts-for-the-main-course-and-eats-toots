import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth/youtube': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  optimizeDeps: {
    include: [
      '@tensorflow/tfjs',
      'zustand',
      '@tanstack/react-query',
      'framer-motion',
      'react-window',
      'date-fns'
    ]
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'tensorflow': ['@tensorflow/tfjs'],
          'vendor': [
            'react',
            'react-dom',
            'zustand',
            '@tanstack/react-query',
            'framer-motion'
          ]
        }
      }
    }
  }
});