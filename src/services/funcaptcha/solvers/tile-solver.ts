import * as tf from '@tensorflow/tfjs';
import { imageProcessor } from '../image-processor';

export class TileSolver {
  private model: tf.LayersModel | null = null;

  constructor() {
    this.initModel();
  }

  private async initModel() {
    const model = tf.sequential();

    // CNN for tile detection
    model.add(tf.layers.conv2d({
      inputShape: [224, 224, 3],
      filters: 32,
      kernelSize: 3,
      padding: 'same',
      activation: 'relu'
    }));

    model.add(tf.layers.maxPooling2d({ poolSize: 2 }));

    [64, 128].forEach(filters => {
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
    model.add(tf.layers.dense({ units: 256, activation: 'relu' }));
    model.add(tf.layers.dropout({ rate: 0.5 }));
    model.add(tf.layers.dense({ units: 9, activation: 'softmax' }));

    model.compile({
      optimizer: tf.train.adam(0.0001),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });

    this.model = model;
  }

  async solve(image: HTMLImageElement): Promise<number> {
    const tensor = await imageProcessor.preprocessImage(image);
    const prediction = await this.model!.predict(tensor) as tf.Tensor;
    const tileIndex = tf.argMax(prediction, 1).dataSync()[0];

    tensor.dispose();
    prediction.dispose();

    return tileIndex;
  }
}