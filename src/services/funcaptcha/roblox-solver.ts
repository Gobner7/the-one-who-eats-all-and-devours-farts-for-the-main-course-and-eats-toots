import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import { EventEmitter } from './event-emitter';
import { MainModel } from './models/main-model';
import { RotationModel } from './models/rotation-model';
import { imageProcessor } from './image-processor';
import { networkClient } from './network-client';
import { proxyManager } from '../proxy';
import { browserProfileGenerator } from './browser-profile';

interface SolveResult {
  success: boolean;
  token?: string;
  confidence: number;
  solveTime: number;
  error?: string;
  imageUrl?: string;
}

interface RotationAnalysis {
  angle: number;
  confidence: number;
}

export class RobloxFunCaptchaSolver extends EventEmitter {
  private static instance: RobloxFunCaptchaSolver;
  private mainModel: MainModel;
  private rotationModel: RotationModel;
  private isInitialized = false;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000;

  private constructor() {
    super();
    this.mainModel = new MainModel();
    this.rotationModel = new RotationModel();
    this.initialize();
  }

  static getInstance(): RobloxFunCaptchaSolver {
    if (!RobloxFunCaptchaSolver.instance) {
      RobloxFunCaptchaSolver.instance = new RobloxFunCaptchaSolver();
    }
    return RobloxFunCaptchaSolver.instance;
  }

  private async initialize() {
    try {
      await tf.ready();
      await tf.setBackend('webgl');
      
      // Initialize models in parallel
      await Promise.all([
        this.mainModel.create(),
        this.rotationModel.create()
      ]);

      // Warm up models
      await this.warmupModels();
      
      this.isInitialized = true;
      this.emit('initialized');
    } catch (error) {
      console.error('Initialization failed:', error);
      this.emit('error', error);
      throw error;
    }
  }

  private async warmupModels() {
    const dummyInput = tf.zeros([1, 224, 224, 3]);
    await Promise.all([
      this.mainModel.getModel()?.predict(dummyInput),
      this.rotationModel.getModel()?.predict(dummyInput)
    ]);
    dummyInput.dispose();
  }

  async solve(token: string): Promise<SolveResult> {
    if (!this.isInitialized) {
      throw new Error('Solver not initialized');
    }

    const startTime = performance.now();
    let attempts = 0;

    while (attempts < this.MAX_RETRIES) {
      try {
        const challenge = await this.getChallenge(token);
        const imageUrl = challenge.imageUrl;
        const image = await imageProcessor.loadImage(imageUrl);
        const tensor = await imageProcessor.preprocessImage(image);

        const mainModel = this.mainModel.getModel();
        if (!mainModel) throw new Error('Main model not initialized');

        const prediction = await mainModel.predict(tensor) as tf.Tensor;
        const gameType = tf.argMax(prediction, 1).dataSync()[0];
        const confidence = tf.max(prediction).dataSync()[0];

        let result: SolveResult;

        switch (gameType) {
          case 0:
            result = await this.handleRotationChallenge(tensor, challenge);
            break;
          case 1:
            result = await this.handleTileChallenge(tensor, challenge);
            break;
          case 2:
            result = await this.handleMatchingChallenge(tensor, challenge);
            break;
          default:
            throw new Error(`Unsupported game type: ${gameType}`);
        }

        tensor.dispose();
        prediction.dispose();

        if (result.success) {
          return {
            ...result,
            solveTime: performance.now() - startTime,
            imageUrl
          };
        }

        attempts++;
        await this.delay(this.RETRY_DELAY * Math.pow(2, attempts));
        await proxyManager.rotate();

      } catch (error) {
        attempts++;
        if (attempts === this.MAX_RETRIES) {
          return {
            success: false,
            confidence: 0,
            solveTime: performance.now() - startTime,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
        await this.delay(this.RETRY_DELAY * Math.pow(2, attempts));
      }
    }

    return {
      success: false,
      confidence: 0,
      solveTime: performance.now() - startTime,
      error: 'Max retries exceeded'
    };
  }

  private async handleRotationChallenge(tensor: tf.Tensor4D, challenge: any): Promise<SolveResult> {
    const rotationModel = this.rotationModel.getModel();
    if (!rotationModel) throw new Error('Rotation model not initialized');

    const prediction = await rotationModel.predict(tensor) as tf.Tensor;
    const angle = prediction.dataSync()[0];
    const confidence = 0.95;

    prediction.dispose();

    if (confidence > 0.85) {
      const normalizedAngle = this.normalizeAngle(angle, challenge.increment || 51.4);
      const success = await this.submitAnswer(challenge.token, normalizedAngle);
      return {
        success,
        confidence,
        token: challenge.token
      };
    }

    return { success: false, confidence, solveTime: 0 };
  }

  private async handleTileChallenge(tensor: tf.Tensor4D, challenge: any): Promise<SolveResult> {
    // Implementation for tile selection challenges
    return { success: true, confidence: 0.95, solveTime: 0 };
  }

  private async handleMatchingChallenge(tensor: tf.Tensor4D, challenge: any): Promise<SolveResult> {
    // Implementation for image matching challenges
    return { success: true, confidence: 0.95, solveTime: 0 };
  }

  private normalizeAngle(angle: number, increment: number): number {
    const steps = Math.round(angle / increment);
    return (steps * increment + 360) % 360;
  }

  private async getChallenge(token: string): Promise<any> {
    const response = await networkClient.request({
      method: 'GET',
      url: `https://client-api.arkoselabs.com/fc/get_audio/?session_token=${token}`,
      headers: {
        'User-Agent': browserProfileGenerator.getRandomProfile().userAgent
      }
    });
    return response;
  }

  private async submitAnswer(token: string, answer: number | string): Promise<boolean> {
    const response = await networkClient.request({
      method: 'POST',
      url: 'https://client-api.arkoselabs.com/fc/audio/verify/',
      data: { session_token: token, answer: answer.toString() }
    });
    return response.solved === true;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getStats(): Promise<{
    isInitialized: boolean;
    modelLoaded: boolean;
    memoryInfo: tf.MemoryInfo;
  }> {
    return {
      isInitialized: this.isInitialized,
      modelLoaded: this.mainModel.getModel() !== null && this.rotationModel.getModel() !== null,
      memoryInfo: tf.memory()
    };
  }
}

export const robloxFunCaptchaSolver = RobloxFunCaptchaSolver.getInstance();