import * as tf from '@tensorflow/tfjs';
import { EventEmitter } from './event-emitter';

export class EnhancedFunCaptchaSolver extends EventEmitter {
  private static instance: EnhancedFunCaptchaSolver;
  private model: tf.LayersModel | null = null;
  private isInitialized = false;

  private constructor() {
    super();
    this.initialize();
  }

  static getInstance(): EnhancedFunCaptchaSolver {
    if (!EnhancedFunCaptchaSolver.instance) {
      EnhancedFunCaptchaSolver.instance = new EnhancedFunCaptchaSolver();
    }
    return EnhancedFunCaptchaSolver.instance;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      await tf.ready();
      this.model = await this.createEnhancedModel();
      this.isInitialized = true;
      this.emit('initialized');
    } catch (error) {
      console.error('Failed to initialize EnhancedFunCaptchaSolver:', error);
      this.emit('error', error);
    }
  }

  private async createEnhancedModel(): Promise<tf.LayersModel> {
    const input = tf.input({shape: [224, 224, 3]});
    
    // Initial convolution
    let x = tf.layers.conv2d({
      filters: 64,
      kernelSize: 3,
      activation: 'relu',
      padding: 'same'
    }).apply(input);

    // Add attention blocks with proper merge layers
    const addAttentionBlock = (inputTensor: tf.SymbolicTensor, filters: number) => {
      const query = tf.layers.conv2d({
        filters,
        kernelSize: 1,
        padding: 'same'
      }).apply(inputTensor);

      const key = tf.layers.conv2d({
        filters,
        kernelSize: 1,
        padding: 'same'
      }).apply(inputTensor);

      const value = tf.layers.conv2d({
        filters,
        kernelSize: 1,
        padding: 'same'
      }).apply(inputTensor);

      const scores = tf.layers.multiply().apply([query, key]);
      const attention = tf.layers.activation({ activation: 'softmax' }).apply(scores);
      const weighted = tf.layers.multiply().apply([attention, value]);
      
      return tf.layers.add().apply([inputTensor, weighted]);
    };

    // Process through multiple attention blocks
    [128, 256, 512].forEach(filters => {
      x = tf.layers.conv2d({
        filters,
        kernelSize: 3,
        padding: 'same',
        activation: 'relu'
      }).apply(x);
      
      x = tf.layers.batchNormalization().apply(x);
      x = addAttentionBlock(x, filters);
      x = tf.layers.maxPooling2d({ poolSize: 2 }).apply(x);
    });

    // Global features
    x = tf.layers.globalAveragePooling2d().apply(x);
    x = tf.layers.dense({ units: 1024, activation: 'relu' }).apply(x);
    x = tf.layers.dropout({ rate: 0.5 }).apply(x);
    x = tf.layers.dense({ units: 512, activation: 'relu' }).apply(x);
    x = tf.layers.dense({ units: 1, activation: 'sigmoid' }).apply(x);

    const model = tf.model({ inputs: input, outputs: x });

    model.compile({
      optimizer: tf.train.adam(0.0001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });

    return model;
  }

  async solve(imageData: string): Promise<{ success: boolean; token?: string; confidence: number }> {
    if (!this.isInitialized || !this.model) {
      throw new Error('Solver not initialized');
    }

    try {
      const tensor = await this.preprocessImage(imageData);
      const prediction = await this.model.predict(tensor) as tf.Tensor;
      const confidence = (await prediction.data())[0];
      const success = confidence > 0.85;

      tensor.dispose();
      prediction.dispose();

      return {
        success,
        confidence,
        token: success ? 'enhanced_token' : undefined
      };
    } catch (error) {
      console.error('Failed to solve captcha:', error);
      return { success: false, confidence: 0 };
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
            
            // Enhanced preprocessing
            const brightened = normalized.mul(1.2);
            const contrasted = brightened.sub(0.5).mul(1.2).add(0.5);
            
            return contrasted.expandDims(0);
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
}

export const enhancedFunCaptchaSolver = EnhancedFunCaptchaSolver.getInstance();