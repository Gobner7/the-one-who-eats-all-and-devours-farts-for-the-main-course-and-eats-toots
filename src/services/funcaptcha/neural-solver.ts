import * as tf from '@tensorflow/tfjs';
import { imageProcessor } from './image-processor';
import { patternAnalyzer } from './pattern-analyzer';

interface SolverResult {
  answer: number | string;
  confidence: number;
  metadata: {
    solveTime: number;
    attempts: number;
    difficulty: number;
  };
}

export class NeuralSolver {
  private rotationModel: tf.LayersModel | null = null;
  private tileModel: tf.LayersModel | null = null;
  private matchingModel: tf.LayersModel | null = null;
  private isInitialized = false;

  async initialize() {
    await tf.ready();
    await tf.setBackend('webgl');
    
    // Initialize models in parallel
    await Promise.all([
      this.createRotationModel(),
      this.createTileModel(),
      this.createMatchingModel()
    ]);

    // Warm up models
    await this.warmupModels();
    
    this.isInitialized = true;
  }

  private async createRotationModel() {
    const model = tf.sequential();

    // Advanced CNN for rotation detection
    model.add(tf.layers.conv2d({
      inputShape: [224, 224, 3],
      filters: 64,
      kernelSize: 7,
      strides: 2,
      padding: 'same',
      activation: 'relu'
    }));

    model.add(tf.layers.batchNormalization());
    model.add(tf.layers.maxPooling2d({ poolSize: 3, strides: 2 }));

    // Residual blocks
    [64, 128, 256, 512].forEach(filters => {
      this.addResidualBlock(model, filters);
    });

    model.add(tf.layers.globalAveragePooling2d());
    model.add(tf.layers.dense({ units: 512, activation: 'relu' }));
    model.add(tf.layers.dropout({ rate: 0.5 }));
    model.add(tf.layers.dense({ units: 1, activation: 'linear' }));

    model.compile({
      optimizer: tf.train.adam(0.0001),
      loss: 'meanSquaredError'
    });

    this.rotationModel = model;
  }

  private async createTileModel() {
    const model = tf.sequential();

    // CNN for tile selection
    model.add(tf.layers.conv2d({
      inputShape: [224, 224, 3],
      filters: 32,
      kernelSize: 3,
      padding: 'same',
      activation: 'relu'
    }));

    [64, 128, 256].forEach(filters => {
      model.add(tf.layers.conv2d({
        filters,
        kernelSize: 3,
        padding: 'same',
        activation: 'relu'
      }));
      model.add(tf.layers.batchNormalization());
      model.add(tf.layers.maxPooling2d({ poolSize: 2 }));
    });

    model.add(tf.layers.globalAveragePooling2d());
    model.add(tf.layers.dense({ units: 256, activation: 'relu' }));
    model.add(tf.layers.dropout({ rate: 0.5 }));
    model.add(tf.layers.dense({ units: 9, activation: 'softmax' }));

    model.compile({
      optimizer: tf.train.adam(0.0001),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });

    this.tileModel = model;
  }

  private async createMatchingModel() {
    const model = tf.sequential();

    // Siamese network for image matching
    model.add(tf.layers.conv2d({
      inputShape: [224, 224, 3],
      filters: 64,
      kernelSize: 3,
      padding: 'same',
      activation: 'relu'
    }));

    [128, 256].forEach(filters => {
      model.add(tf.layers.conv2d({
        filters,
        kernelSize: 3,
        padding: 'same',
        activation: 'relu'
      }));
      model.add(tf.layers.batchNormalization());
      model.add(tf.layers.maxPooling2d({ poolSize: 2 }));
    });

    model.add(tf.layers.globalAveragePooling2d());
    model.add(tf.layers.dense({ units: 256, activation: 'relu' }));
    model.add(tf.layers.dropout({ rate: 0.5 }));
    model.add(tf.layers.dense({ units: 128, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));

    model.compile({
      optimizer: tf.train.adam(0.0001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });

    this.matchingModel = model;
  }

  private addResidualBlock(model: tf.Sequential, filters: number) {
    const input = model.layers[model.layers.length - 1].output as tf.SymbolicTensor;
    
    const conv1 = tf.layers.conv2d({
      filters,
      kernelSize: 3,
      padding: 'same',
      activation: 'relu'
    }).apply(input);

    const bn1 = tf.layers.batchNormalization().apply(conv1);
    
    const conv2 = tf.layers.conv2d({
      filters,
      kernelSize: 3,
      padding: 'same'
    }).apply(bn1);

    const bn2 = tf.layers.batchNormalization().apply(conv2);

    const shortcut = input.shape[3] === filters
      ? input
      : tf.layers.conv2d({
          filters,
          kernelSize: 1,
          padding: 'same'
        }).apply(input);

    const addition = tf.layers.add().apply([bn2, shortcut]);
    const activation = tf.layers.activation({ activation: 'relu' }).apply(addition);

    model.add(tf.layers.dense({ units: filters }));
  }

  private async warmupModels() {
    const dummyInput = tf.zeros([1, 224, 224, 3]);
    await Promise.all([
      this.rotationModel?.predict(dummyInput),
      this.tileModel?.predict(dummyInput),
      this.matchingModel?.predict(dummyInput)
    ]);
    dummyInput.dispose();
  }

  async solve(image: HTMLImageElement, type: 'rotation' | 'tile' | 'matching'): Promise<SolverResult> {
    if (!this.isInitialized) {
      throw new Error('Neural solver not initialized');
    }

    const startTime = performance.now();
    let attempts = 0;

    try {
      // Analyze pattern first
      const pattern = await patternAnalyzer.analyzePattern(image);
      const solvability = await patternAnalyzer.predictSolvability(pattern);

      if (solvability < 0.5) {
        throw new Error('Pattern deemed too difficult to solve reliably');
      }

      // Preprocess image
      const tensor = await imageProcessor.preprocessImage(image);

      let answer: number | string;
      let confidence: number;

      switch (type) {
        case 'rotation':
          ({ answer, confidence } = await this.solveRotation(tensor));
          break;
        case 'tile':
          ({ answer, confidence } = await this.solveTile(tensor));
          break;
        case 'matching':
          ({ answer, confidence } = await this.solveMatching(tensor));
          break;
        default:
          throw new Error(`Unsupported challenge type: ${type}`);
      }

      tensor.dispose();

      return {
        answer,
        confidence,
        metadata: {
          solveTime: performance.now() - startTime,
          attempts,
          difficulty: pattern.metadata.difficulty
        }
      };
    } catch (error) {
      throw new Error(`Solve failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async solveRotation(tensor: tf.Tensor4D): Promise<{ answer: number; confidence: number }> {
    const prediction = await this.rotationModel!.predict(tensor) as tf.Tensor;
    const angle = (await prediction.data())[0];
    const confidence = this.calculateRotationConfidence(prediction);
    
    prediction.dispose();

    return {
      answer: this.normalizeAngle(angle),
      confidence
    };
  }

  private async solveTile(tensor: tf.Tensor4D): Promise<{ answer: number; confidence: number }> {
    const prediction = await this.tileModel!.predict(tensor) as tf.Tensor;
    const probabilities = await prediction.data();
    const tileIndex = probabilities.indexOf(Math.max(...Array.from(probabilities)));
    const confidence = probabilities[tileIndex];
    
    prediction.dispose();

    return {
      answer: tileIndex,
      confidence
    };
  }

  private async solveMatching(tensor: tf.Tensor4D): Promise<{ answer: number; confidence: number }> {
    const prediction = await this.matchingModel!.predict(tensor) as tf.Tensor;
    const similarity = (await prediction.data())[0];
    
    prediction.dispose();

    return {
      answer: Math.round(similarity * 100),
      confidence: similarity
    };
  }

  private normalizeAngle(angle: number): number {
    return Math.round(angle / 51.4) * 51.4;
  }

  private calculateRotationConfidence(prediction: tf.Tensor): number {
    const variance = tf.moments(prediction).variance.dataSync()[0];
    return 1 / (1 + Math.sqrt(variance));
  }

  getRotationSolver() {
    return {
      solve: async (image: HTMLImageElement, increment: number) => {
        return this.solve(image, 'rotation');
      }
    };
  }

  getTileSolver() {
    return {
      solve: async (image: HTMLImageElement) => {
        return this.solve(image, 'tile');
      }
    };
  }

  getMatchingSolver() {
    return {
      solve: async (image: HTMLImageElement) => {
        return this.solve(image, 'matching');
      }
    };
  }
}

export const neuralSolver = new NeuralSolver();