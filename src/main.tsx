import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Initialize TensorFlow.js
import * as tf from '@tensorflow/tfjs';
tf.ready().then(() => {
  console.log('TensorFlow.js initialized');
}).catch(error => {
  console.error('Failed to initialize TensorFlow.js:', error);
});

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);