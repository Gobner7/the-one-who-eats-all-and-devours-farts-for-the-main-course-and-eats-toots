import * as tf from '@tensorflow/tfjs';

export class CaptchaModel {
  private model: tf.LayersModel | null = null;

  async create(): Promise<tf.LayersModel> {
    const input = tf.input({shape: [224, 224, 3]});
    
    let x = tf.layers.conv2d({
      filters: 64,
      kernelSize: 7,
      strides: 2,
      padding: 'same',
      activation: 'relu'
    }).apply(input);

    x = tf.layers.batchNormalization().apply(x);
    x = tf.layers.maxPooling2d({ poolSize: 3, strides: 2, padding: 'same' }).apply(x);

    // Residual blocks
    const filterSizes = [64, 128, 256, 512];
    filterSizes.forEach((filters, i) => {
      x = this.addResidualBlock(x, filters, i > 0 ? 2 : 1);
    });

    x = tf.layers.globalAveragePooling2d({ dataFormat: 'channelsLast' }).apply(x);
    x = tf.layers.dense({ units: 1024, activation: 'relu' }).apply(x);
    x = tf.layers.dropout({ rate: 0.5 }).apply(x);
    x = tf.layers.dense({ units: 512, activation: 'relu' }).apply(x);
    x = tf.layers.dense({ units: 1, activation: 'sigmoid' }).apply(x);

    this.model = tf.model({ inputs: input, outputs: x });
    
    this.model.compile({
      optimizer: tf.train.adam(0.0001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });

    return this.model;
  }

  private addResidualBlock(input: tf.SymbolicTensor, filters: number, strides: number = 1): tf.SymbolicTensor {
    const x = tf.layers.conv2d({
      filters,
      kernelSize: 3,
      strides,
      padding: 'same',
      activation: 'relu'
    }).apply(input);

    const y = tf.layers.batchNormalization().apply(x);
    const z = tf.layers.conv2d({
      filters,
      kernelSize: 3,
      padding: 'same'
    }).apply(y);

    const shortcut = strides > 1 
      ? tf.layers.conv2d({
          filters,
          kernelSize: 1,
          strides,
          padding: 'same'
        }).apply(input)
      : input;

    return tf.layers.add().apply([z, shortcut]);
  }

  getModel(): tf.LayersModel | null {
    return this.model;
  }

  async predict(input: tf.Tensor4D): Promise<tf.Tensor> {
    if (!this.model) throw new Error('Model not initialized');
    return this.model.predict(input) as tf.Tensor;
  }

  async warmup(): Promise<void> {
    const dummyInput = tf.zeros([1, 224, 224, 3]);
    await this.predict(dummyInput);
    dummyInput.dispose();
  }
}