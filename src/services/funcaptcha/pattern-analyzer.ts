import * as tf from '@tensorflow/tfjs';

interface Pattern {
  type: string;
  confidence: number;
  features: number[];
  metadata: {
    timestamp: number;
    difficulty: number;
    complexity: number;
  };
}

interface PatternFeatures {
  edges: number[];
  contours: number[];
  textures: number[];
  colorHistogram: number[];
}

export class PatternAnalyzer {
  private static instance: PatternAnalyzer;
  private model: tf.LayersModel | null = null;
  private patterns: Map<string, Pattern[]> = new Map();
  private readonly MIN_CONFIDENCE = 0.85;

  private constructor() {
    this.initialize();
  }

  static getInstance(): PatternAnalyzer {
    if (!PatternAnalyzer.instance) {
      PatternAnalyzer.instance = new PatternAnalyzer();
    }
    return PatternAnalyzer.instance;
  }

  private async initialize() {
    await tf.ready();
    this.model = await this.createAnalysisModel();
    await this.warmupModel();
  }

  private async createAnalysisModel(): Promise<tf.LayersModel> {
    const model = tf.sequential();

    // Feature extraction layers
    model.add(tf.layers.dense({
      units: 256,
      activation: 'relu',
      inputShape: [512]
    }));
    model.add(tf.layers.dropout({ rate: 0.3 }));

    // Pattern recognition layers
    model.add(tf.layers.dense({
      units: 128,
      activation: 'relu'
    }));
    model.add(tf.layers.dense({
      units: 64,
      activation: 'relu'
    }));

    // Classification layer
    model.add(tf.layers.dense({
      units: 32,
      activation: 'softmax'
    }));

    model.compile({
      optimizer: tf.train.adam(0.0001),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });

    return model;
  }

  private async warmupModel() {
    if (!this.model) return;
    const dummyInput = tf.zeros([1, 512]);
    await this.model.predict(dummyInput);
    dummyInput.dispose();
  }

  async analyzePattern(image: HTMLImageElement): Promise<Pattern> {
    const features = await this.extractFeatures(image);
    const tensor = tf.tensor2d([features], [1, features.length]);
    
    if (!this.model) {
      throw new Error('Model not initialized');
    }

    const prediction = await this.model.predict(tensor) as tf.Tensor;
    const probabilities = await prediction.data();
    
    // Clean up tensors
    tensor.dispose();
    prediction.dispose();

    const pattern = this.classifyPattern(probabilities, features);
    this.updatePatternDatabase(pattern);

    return pattern;
  }

  private async extractFeatures(image: HTMLImageElement): Promise<number[]> {
    return tf.tidy(() => {
      const tensor = tf.browser.fromPixels(image)
        .toFloat()
        .div(255.0);

      // Extract edge features
      const edges = this.extractEdgeFeatures(tensor);
      
      // Extract texture features
      const textures = this.extractTextureFeatures(tensor);
      
      // Extract color features
      const colors = this.extractColorFeatures(tensor);

      // Combine all features
      return Array.from(tf.concat([edges, textures, colors]).dataSync());
    });
  }

  private extractEdgeFeatures(tensor: tf.Tensor3D): tf.Tensor1D {
    const sobelX = tf.conv2d(
      tensor.expandDims(0),
      tf.tensor4d([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], [3, 3, 1, 1]),
      1,
      'same'
    );
    
    const sobelY = tf.conv2d(
      tensor.expandDims(0),
      tf.tensor4d([[-1, -2, -1], [0, 0, 0], [1, 2, 1]], [3, 3, 1, 1]),
      1,
      'same'
    );

    const magnitude = tf.sqrt(tf.add(tf.square(sobelX), tf.square(sobelY)));
    return tf.mean(magnitude, [1, 2, 3]);
  }

  private extractTextureFeatures(tensor: tf.Tensor3D): tf.Tensor1D {
    const grayScale = tf.mean(tensor, -1);
    const glcm = this.computeGLCM(grayScale);
    return tf.mean(glcm, [0, 1]);
  }

  private extractColorFeatures(tensor: tf.Tensor3D): tf.Tensor1D {
    const channels = tf.split(tensor, 3, -1);
    const histograms = channels.map(channel => 
      tf.histogramFixed(channel, 8, 0, 1)
    );
    return tf.concat(histograms);
  }

  private computeGLCM(grayScale: tf.Tensor2D): tf.Tensor2D {
    const quantized = tf.floor(tf.mul(grayScale, 8));
    const shifted = tf.slice(quantized, [0, 1], [-1, -1]);
    const pairs = tf.stack([
      tf.slice(quantized, [0, 0], [-1, -1]),
      shifted
    ]);
    return tf.matMul(pairs, pairs, true);
  }

  private classifyPattern(probabilities: Float32Array, features: number[]): Pattern {
    const patternTypes = ['rotation', 'tile', 'match', 'slide'];
    const maxIndex = probabilities.indexOf(Math.max(...Array.from(probabilities)));
    const confidence = probabilities[maxIndex];

    return {
      type: patternTypes[maxIndex],
      confidence,
      features,
      metadata: {
        timestamp: Date.now(),
        difficulty: this.calculateDifficulty(features),
        complexity: this.calculateComplexity(features)
      }
    };
  }

  private calculateDifficulty(features: number[]): number {
    const edgeComplexity = features.slice(0, 128).reduce((a, b) => a + b, 0) / 128;
    const textureVariation = features.slice(128, 256).reduce((a, b) => a + Math.abs(b), 0) / 128;
    return (edgeComplexity + textureVariation) / 2;
  }

  private calculateComplexity(features: number[]): number {
    const colorVariation = features.slice(256).reduce((a, b) => a + b, 0) / 256;
    const featureEntropy = features.reduce((e, f) => e - (f * Math.log2(f + 1e-10)), 0);
    return (colorVariation + featureEntropy) / 2;
  }

  private updatePatternDatabase(pattern: Pattern) {
    const existing = this.patterns.get(pattern.type) || [];
    existing.push(pattern);
    
    // Keep only recent patterns
    if (existing.length > 1000) {
      existing.shift();
    }
    
    this.patterns.set(pattern.type, existing);
  }

  getPatternStats(type: string): {
    avgConfidence: number;
    avgDifficulty: number;
    avgComplexity: number;
  } {
    const patterns = this.patterns.get(type) || [];
    if (patterns.length === 0) {
      return {
        avgConfidence: 0,
        avgDifficulty: 0,
        avgComplexity: 0
      };
    }

    return {
      avgConfidence: patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length,
      avgDifficulty: patterns.reduce((sum, p) => sum + p.metadata.difficulty, 0) / patterns.length,
      avgComplexity: patterns.reduce((sum, p) => sum + p.metadata.complexity, 0) / patterns.length
    };
  }

  async predictSolvability(pattern: Pattern): Promise<number> {
    const similarPatterns = this.patterns.get(pattern.type) || [];
    const recentPatterns = similarPatterns
      .filter(p => Date.now() - p.metadata.timestamp < 24 * 60 * 60 * 1000);

    if (recentPatterns.length === 0) {
      return pattern.confidence;
    }

    const successfulPatterns = recentPatterns
      .filter(p => p.confidence > this.MIN_CONFIDENCE);

    return successfulPatterns.length / recentPatterns.length;
  }
}

export const patternAnalyzer = PatternAnalyzer.getInstance();