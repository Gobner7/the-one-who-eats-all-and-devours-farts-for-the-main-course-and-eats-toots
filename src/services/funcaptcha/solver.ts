import * as tf from '@tensorflow/tfjs';
import { EventEmitter } from './event-emitter';

interface SolveResult {
  success: boolean;
  confidence: number;
  solveTime: number;
  error?: string;
  details?: string;
}

export class FunCaptchaSolver extends EventEmitter {
  private static instance: FunCaptchaSolver;
  private model: tf.LayersModel | null = null;
  private isInitialized = false;
  private initPromise: Promise<void>;

  private constructor() {
    super();
    this.initPromise = this.initialize();
  }

  static getInstance(): FunCaptchaSolver {
    if (!FunCaptchaSolver.instance) {
      FunCaptchaSolver.instance = new FunCaptchaSolver();
    }
    return FunCaptchaSolver.instance;
  }

  private async initialize() {
    try {
      await tf.ready();
      this.model = await this.createModel();
      await this.loadPretrainedWeights();
      this.isInitialized = true;
      this.emit('initialized');
    } catch (error) {
      console.error('Initialization failed:', error);
      this.emit('error', error);
      throw error;
    }
  }

  private async createModel(): Promise<tf.LayersModel> {
    const model = tf.sequential({
      layers: [
        tf.layers.conv2d({
          inputShape: [224, 224, 3],
          filters: 32,
          kernelSize: 3,
          activation: 'relu',
          padding: 'same'
        }),
        tf.layers.maxPooling2d({ poolSize: 2 }),
        
        tf.layers.conv2d({
          filters: 64,
          kernelSize: 3,
          activation: 'relu',
          padding: 'same'
        }),
        tf.layers.maxPooling2d({ poolSize: 2 }),
        
        tf.layers.conv2d({
          filters: 128,
          kernelSize: 3,
          activation: 'relu',
          padding: 'same'
        }),
        tf.layers.maxPooling2d({ poolSize: 2 }),
        
        tf.layers.conv2d({
          filters: 256,
          kernelSize: 3,
          activation: 'relu',
          padding: 'same'
        }),
        tf.layers.maxPooling2d({ poolSize: 2 }),
        
        tf.layers.flatten(),
        tf.layers.dense({ units: 512, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.5 }),
        tf.layers.dense({ units: 256, activation: 'relu' }),
        tf.layers.dense({ units: 1, activation: 'sigmoid' })
      ]
    });

    model.compile({
      optimizer: tf.train.adam(0.0001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });

    return model;
  }

  private async loadPretrainedWeights() {
    // In a production environment, you would load pre-trained weights here
    // For now, we'll initialize with random weights
    return Promise.resolve();
  }

  async solve(imageData: string): Promise<SolveResult> {
    if (!this.isInitialized || !this.model) {
      await this.initPromise;
    }

    if (!this.model) {
      return {
        success: false,
        confidence: 0,
        solveTime: 0,
        error: 'Model not initialized'
      };
    }

    const startTime = performance.now();
    
    try {
      const tensor = await this.preprocessImage(imageData);
      const prediction = this.model.predict(tensor) as tf.Tensor;
      const confidence = (await prediction.data())[0];
      const success = confidence > 0.85;

      tensor.dispose();
      prediction.dispose();

      const solveTime = performance.now() - startTime;

      return {
        success,
        confidence,
        solveTime,
        details: `Confidence: ${(confidence * 100).toFixed(1)}%`
      };
    } catch (error) {
      const solveTime = performance.now() - startTime;
      return {
        success: false,
        confidence: 0,
        solveTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async preprocessImage(imageData: string): Promise<tf.Tensor4D> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        try {
          const tensor = tf.tidy(() => {
            const pixels = tf.browser.fromPixels(img);
            const resized = tf.image.resizeBilinear(pixels, [224, 224]);
            const normalized = resized.toFloat().div(255.0);
            return normalized.expandDims(0);
          });
          resolve(tensor as tf.Tensor4D);
        } catch (error) {
          reject(new Error('Failed to process image'));
        }
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      
      if (imageData.startsWith('data:image')) {
        img.src = imageData;
      } else {
        img.src = `data:image/jpeg;base64,${imageData}`;
      }
    });
  }

  async getStats(): Promise<{
    isInitialized: boolean;
    modelLoaded: boolean;
    memoryInfo: tf.MemoryInfo;
  }> {
    return {
      isInitialized: this.isInitialized,
      modelLoaded: this.model !== null,
      memoryInfo: tf.memory()
    };
  }
}

export const funcaptchaSolver = FunCaptchaSolver.getInstance();