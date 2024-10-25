import * as tf from '@tensorflow/tfjs';
import { imageProcessor } from '../image-processor';

export class RotationSolver {
  private model: tf.LayersModel | null = null;

  constructor() {
    this.initModel();
  }

  private async initModel() {
    const model = tf.sequential();

    // CNN for rotation detection
    model.add(tf.layers.conv2d({
      inputShape: [224, 224, 3],
      filters: 64,
      kernelSize: 7,
      strides: 2,
      padding: 'same',
      activation: 'relu'
    }));

    model.add(tf.layers.maxPooling2d({ poolSize: 2 }));

    // Multiple convolutional blocks
    [128, 256, 512].forEach(filters => {
      model.add(tf.layers.conv2d({
        filters,
        kernelSize: 3,
        padding: 'same',
        activation: 'relu'
      }));
      model.add(tf.layers.batchNormalization());
      model.add(tf.layers.maxPooling2d({ poolSize: 2 }));
    });

    model.add(tf.layers.globalAveragePooling2d({ dataFormat: 'channelsLast' }));
    model.add(tf.layers.dense({ units: 512, activation: 'relu' }));
    model.add(tf.layers.dropout({ rate: 0.5 }));
    model.add(tf.layers.dense({ units: 1, activation: 'linear' }));

    model.compile({
      optimizer: tf.train.adam(0.0001),
      loss: 'meanSquaredError'
    });

    this.model = model;
  }

  async solve(image: HTMLImageElement, increment: number): Promise<number> {
    const tensor = await imageProcessor.preprocessImage(image);
    const prediction = await this.model!.predict(tensor) as tf.Tensor;
    const angle = (await prediction.data())[0];

    tensor.dispose();
    prediction.dispose();

    // Normalize angle to nearest valid increment
    return Math.round(angle / increment) * increment;
  }
}