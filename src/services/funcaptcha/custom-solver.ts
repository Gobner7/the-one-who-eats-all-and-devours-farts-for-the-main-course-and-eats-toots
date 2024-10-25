import * as tf from '@tensorflow/tfjs';
import { imageProcessor } from './image-processor';
import { EventEmitter } from './event-emitter';

interface SolveResult {
  success: boolean;
  confidence: number;
  solveTime: number;
  error?: string;
  details?: string;
  imageData?: string;
}

export class CustomCaptchaSolver extends EventEmitter {
  private static instance: CustomCaptchaSolver;
  private model: tf.LayersModel | null = null;
  private isModelTraining: boolean = false;
  private readonly IMAGE_SIZE = 224;

  private constructor() {
    super();
    this.initModel();
  }

  static getInstance(): CustomCaptchaSolver {
    if (!CustomCaptchaSolver.instance) {
      CustomCaptchaSolver.instance = new CustomCaptchaSolver();
    }
    return CustomCaptchaSolver.instance;
  }

  private async initModel() {
    try {
      await tf.ready();
      this.model = await this.createModel();
      await this.warmupModel();
      this.emit('initialized');
    } catch (error) {
      console.error('Model initialization failed:', error);
      this.emit('error', error);
    }
  }

  private async warmupModel() {
    if (!this.model) return;
    
    const dummyInput = tf.zeros([1, this.IMAGE_SIZE, this.IMAGE_SIZE, 3]);
    await this.model.predict(dummyInput);
    dummyInput.dispose();
  }

  private createModel(): tf.LayersModel {
    const model = tf.sequential();

    // Enhanced CNN architecture
    model.add(tf.layers.conv2d({
      inputShape: [this.IMAGE_SIZE, this.IMAGE_SIZE, 3],
      filters: 32,
      kernelSize: 3,
      activation: 'relu',
      padding: 'same'
    }));
    model.add(tf.layers.batchNormalization());
    model.add(tf.layers.maxPooling2d({ poolSize: 2 }));

    // Multiple convolutional blocks with residual connections
    [64, 128, 256].forEach(filters => {
      const conv1 = tf.layers.conv2d({
        filters,
        kernelSize: 3,
        activation: 'relu',
        padding: 'same'
      });
      
      const conv2 = tf.layers.conv2d({
        filters,
        kernelSize: 3,
        padding: 'same'
      });
      
      model.add(conv1);
      model.add(conv2);
      model.add(tf.layers.batchNormalization());
      model.add(tf.layers.maxPooling2d({ poolSize: 2 }));
    });

    // Dense layers for classification
    model.add(tf.layers.flatten());
    model.add(tf.layers.dense({ units: 512, activation: 'relu' }));
    model.add(tf.layers.dropout({ rate: 0.5 }));
    model.add(tf.layers.dense({ units: 256, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));

    model.compile({
      optimizer: tf.train.adam(0.0001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });

    return model;
  }

  async solveCaptcha(imageUrl: string): Promise<SolveResult> {
    const startTime = performance.now();

    try {
      // Load and preprocess image
      const image = await imageProcessor.loadImage(imageUrl);
      const tensor = await imageProcessor.preprocessImage(image);
      
      // Extract features
      const features = await imageProcessor.extractFeatures(tensor);
      
      // Make prediction
      const prediction = await this.model!.predict(tensor) as tf.Tensor;
      const confidence = (await prediction.data())[0];
      
      // Clean up tensors
      tensor.dispose();
      features.dispose();
      prediction.dispose();

      const solveTime = performance.now() - startTime;
      const success = confidence > 0.85;

      return {
        success,
        confidence,
        solveTime,
        imageData: imageUrl,
        details: success ? 'Successfully solved captcha' : 'Failed to solve captcha'
      };
    } catch (error) {
      const solveTime = performance.now() - startTime;
      return {
        success: false,
        confidence: 0,
        solveTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Failed to process image'
      };
    }
  }

  async getModelStats(): Promise<{
    isInitialized: boolean;
    memoryInfo: tf.MemoryInfo;
  }> {
    return {
      isInitialized: this.model !== null,
      memoryInfo: tf.memory()
    };
  }
}

export const customCaptchaSolver = CustomCaptchaSolver.getInstance();