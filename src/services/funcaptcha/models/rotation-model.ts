import * as tf from '@tensorflow/tfjs';

export class RotationModel {
  private model: tf.LayersModel | null = null;
  private readonly IMAGE_SIZE = 224;

  async create(): Promise<tf.LayersModel> {
    const model = tf.sequential();

    // Input processing
    model.add(tf.layers.conv2d({
      inputShape: [this.IMAGE_SIZE, this.IMAGE_SIZE, 3],
      filters: 32,
      kernelSize: 7,
      strides: 2,
      padding: 'same',
      activation: 'relu'
    }));

    // Feature extraction blocks
    const filterSizes = [64, 128, 256];
    
    filterSizes.forEach(filters => {
      // Convolutional block
      model.add(tf.layers.conv2d({
        filters,
        kernelSize: 3,
        padding: 'same',
        activation: 'relu'
      }));
      model.add(tf.layers.batchNormalization());
      
      // Pooling
      model.add(tf.layers.maxPooling2d({ poolSize: [2, 2] }));
    });

    // Flatten and dense layers for angle prediction
    model.add(tf.layers.flatten());
    model.add(tf.layers.dense({ units: 256, activation: 'relu' }));
    model.add(tf.layers.dropout({ rate: 0.5 }));
    model.add(tf.layers.dense({ units: 128, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 1, activation: 'linear' }));

    model.compile({
      optimizer: tf.train.adam(0.0001),
      loss: 'meanSquaredError'
    });

    this.model = model;
    return model;
  }

  getModel(): tf.LayersModel | null {
    return this.model;
  }
}