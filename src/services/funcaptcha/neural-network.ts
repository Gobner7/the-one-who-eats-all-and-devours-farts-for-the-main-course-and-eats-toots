import * as tf from '@tensorflow/tfjs';
import { EventEmitter } from 'events';

interface TrainingProgress {
  epoch: number;
  loss: number;
  accuracy: number;
}

export class NeuralNetwork extends EventEmitter {
  private model: tf.LayersModel | null = null;
  private isTraining = false;
  private preprocessingModel: tf.LayersModel | null = null;

  constructor() {
    super();
    this.initialize();
  }

  private async initialize() {
    await tf.ready();
    this.model = await this.createMainModel();
    this.preprocessingModel = await this.createPreprocessingModel();
    this.emit('initialized');
  }

  private createMainModel(): tf.LayersModel {
    const model = tf.sequential();

    // Advanced CNN architecture with residual connections
    const addResidualBlock = (inputLayer: tf.SymbolicTensor, filters: number) => {
      const conv1 = tf.layers.conv2d({
        filters,
        kernelSize: 3,
        padding: 'same',
        activation: 'relu'
      }).apply(inputLayer) as tf.SymbolicTensor;

      const conv2 = tf.layers.conv2d({
        filters,
        kernelSize: 3,
        padding: 'same'
      }).apply(conv1) as tf.SymbolicTensor;

      const shortcut = tf.layers.conv2d({
        filters,
        kernelSize: 1,
        padding: 'same'
      }).apply(inputLayer) as tf.SymbolicTensor;

      return tf.layers.add().apply([conv2, shortcut]) as tf.SymbolicTensor;
    };

    // Input layer
    const input = tf.input({shape: [224, 224, 3]});
    
    // Initial convolution
    let x = tf.layers.conv2d({
      filters: 64,
      kernelSize: 7,
      strides: 2,
      padding: 'same',
      activation: 'relu'
    }).apply(input) as tf.SymbolicTensor;

    x = tf.layers.maxPooling2d({poolSize: 3, strides: 2, padding: 'same'}).apply(x) as tf.SymbolicTensor;

    // Residual blocks
    const filterSizes = [64, 128, 256, 512];
    filterSizes.forEach((filters, i) => {
      x = addResidualBlock(x, filters);
      if (i < filterSizes.length - 1) {
        x = tf.layers.maxPooling2d({poolSize: 2, strides: 2}).apply(x) as tf.SymbolicTensor;
      }
    });

    // Global average pooling
    x = tf.layers.globalAveragePooling2d().apply(x) as tf.SymbolicTensor;

    // Dense layers with dropout for regularization
    x = tf.layers.dense({units: 1024, activation: 'relu'}).apply(x) as tf.SymbolicTensor;
    x = tf.layers.dropout({rate: 0.5}).apply(x) as tf.SymbolicTensor;
    x = tf.layers.dense({units: 512, activation: 'relu'}).apply(x) as tf.SymbolicTensor;
    x = tf.layers.dropout({rate: 0.3}).apply(x) as tf.SymbolicTensor;

    // Output layer
    const output = tf.layers.dense({units: 1, activation: 'sigmoid'}).apply(x) as tf.SymbolicTensor;

    const model = tf.model({inputs: input, outputs: output});

    model.compile({
      optimizer: tf.train.adam(0.0001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });

    return model;
  }

  private createPreprocessingModel(): tf.LayersModel {
    const model = tf.sequential();

    // Image enhancement layers
    model.add(tf.layers.conv2d({
      inputShape: [224, 224, 3],
      filters: 32,
      kernelSize: 3,
      padding: 'same',
      activation: 'relu'
    }));

    model.add(tf.layers.conv2d({
      filters: 3,
      kernelSize: 3,
      padding: 'same',
      activation: 'sigmoid'
    }));

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError'
    });

    return model;
  }

  async preprocess(imageData: ImageData): Promise<tf.Tensor4D> {
    const tensor = tf.browser.fromPixels(imageData)
      .toFloat()
      .div(255.0)
      .resizeBilinear([224, 224])
      .expandDims(0);

    if (this.preprocessingModel) {
      return this.preprocessingModel.predict(tensor) as tf.Tensor4D;
    }

    return tensor;
  }

  async train(dataset: { images: tf.Tensor4D; labels: tf.Tensor2D }, epochs = 50) {
    if (!this.model || this.isTraining) return;

    this.isTraining = true;
    this.emit('trainingStart');

    try {
      await this.model.fit(dataset.images, dataset.labels, {
        epochs,
        batchSize: 32,
        validationSplit: 0.2,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            const progress: TrainingProgress = {
              epoch,
              loss: logs?.loss || 0,
              accuracy: logs?.acc || 0
            };
            this.emit('trainingProgress', progress);
          }
        }
      });

      this.emit('trainingComplete');
    } catch (error) {
      this.emit('trainingError', error);
    } finally {
      this.isTraining = false;
    }
  }

  async predict(imageData: ImageData): Promise<number> {
    if (!this.model) throw new Error('Model not initialized');

    const preprocessed = await this.preprocess(imageData);
    const prediction = await this.model.predict(preprocessed) as tf.Tensor;
    const result = (await prediction.data())[0];

    preprocessed.dispose();
    prediction.dispose();

    return result;
  }

  async save(path: string): Promise<void> {
    if (!this.model) throw new Error('Model not initialized');
    await this.model.save(`file://${path}`);
  }

  async load(path: string): Promise<void> {
    this.model = await tf.loadLayersModel(`file://${path}`);
  }
}

export const neuralNetwork = new NeuralNetwork();