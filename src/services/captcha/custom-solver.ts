import * as tf from '@tensorflow/tfjs';

interface PreprocessingOptions {
  threshold?: number;
  normalize?: boolean;
  removeNoise?: boolean;
  segmentation?: boolean;
}

export class CustomCaptchaSolver {
  private static instance: CustomCaptchaSolver;
  private model: tf.LayersModel | null = null;
  private isModelTraining: boolean = false;

  private constructor() {
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
      this.model = await this.createModel();
      await this.trainModel();
    } catch (error) {
      console.error('Model initialization failed:', error);
    }
  }

  private createModel(): tf.LayersModel {
    const model = tf.sequential();

    // Convolutional layers for feature extraction
    model.add(tf.layers.conv2d({
      inputShape: [50, 200, 1],
      filters: 32,
      kernelSize: 3,
      activation: 'relu',
      padding: 'same'
    }));
    model.add(tf.layers.batchNormalization());
    model.add(tf.layers.maxPooling2d({ poolSize: 2 }));

    // Second conv block
    model.add(tf.layers.conv2d({
      filters: 64,
      kernelSize: 3,
      activation: 'relu',
      padding: 'same'
    }));
    model.add(tf.layers.batchNormalization());
    model.add(tf.layers.maxPooling2d({ poolSize: 2 }));

    // Third conv block with residual connection
    model.add(tf.layers.conv2d({
      filters: 128,
      kernelSize: 3,
      activation: 'relu',
      padding: 'same'
    }));
    model.add(tf.layers.batchNormalization());
    model.add(tf.layers.dropout({ rate: 0.25 }));

    // Dense layers for classification
    model.add(tf.layers.flatten());
    model.add(tf.layers.dense({ units: 256, activation: 'relu' }));
    model.add(tf.layers.dropout({ rate: 0.5 }));
    model.add(tf.layers.dense({ units: 128, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 36, activation: 'softmax' }));

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });

    return model;
  }

  private async trainModel() {
    if (this.isModelTraining || !this.model) return;
    this.isModelTraining = true;

    try {
      const { images, labels } = await this.generateSyntheticData(1000);
      
      await this.model.fit(images, labels, {
        epochs: 50,
        batchSize: 32,
        validationSplit: 0.2,
        callbacks: {
          onEpochEnd: async (epoch, logs) => {
            console.log(`Epoch ${epoch}: loss = ${logs?.loss.toFixed(4)}, accuracy = ${logs?.acc.toFixed(4)}`);
          }
        }
      });
    } finally {
      this.isModelTraining = false;
    }
  }

  private async generateSyntheticData(samples: number) {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d')!;
    const images: tf.Tensor4D[] = [];
    const labels: tf.Tensor2D[] = [];
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    for (let i = 0; i < samples; i++) {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, 200, 50);
      ctx.fillStyle = 'black';
      ctx.font = '30px Arial';

      const text = Array(6).fill(0)
        .map(() => chars[Math.floor(Math.random() * chars.length)])
        .join('');

      // Add random noise and distortion
      this.addNoise(ctx, 200, 50);
      this.addDistortion(ctx, 200, 50);

      ctx.fillText(text, 10, 35);

      const imageData = ctx.getImageData(0, 0, 200, 50);
      const tensor = tf.browser.fromPixels(imageData, 1)
        .toFloat()
        .div(255.0)
        .expandDims(0);

      images.push(tensor as tf.Tensor4D);
      labels.push(this.textToTensor(text));
    }

    return {
      images: tf.concat(images, 0),
      labels: tf.concat(labels, 0)
    };
  }

  private addNoise(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;

    for (let i = 0; i < pixels.length; i += 4) {
      const noise = Math.random() * 50 - 25;
      pixels[i] = Math.max(0, Math.min(255, pixels[i] + noise));
      pixels[i + 1] = Math.max(0, Math.min(255, pixels[i + 1] + noise));
      pixels[i + 2] = Math.max(0, Math.min(255, pixels[i + 2] + noise));
    }

    ctx.putImageData(imageData, 0, 0);
  }

  private addDistortion(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;
    const amplitude = 3;
    const period = 200;

    const distorted = new ImageData(width, height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = Math.sin(y / period * Math.PI * 2) * amplitude;
        const newX = Math.floor(x + dx);
        if (newX >= 0 && newX < width) {
          const srcIdx = (y * width + x) * 4;
          const dstIdx = (y * width + newX) * 4;
          for (let c = 0; c < 4; c++) {
            distorted.data[dstIdx + c] = pixels[srcIdx + c];
          }
        }
      }
    }

    ctx.putImageData(distorted, 0, 0);
  }

  private textToTensor(text: string): tf.Tensor2D {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const result = Array(text.length).fill(0)
      .map((_, i) => {
        const char = text[i];
        const index = chars.indexOf(char);
        const vector = Array(36).fill(0);
        vector[index] = 1;
        return vector;
      });
    return tf.tensor2d(result);
  }

  private async preprocessImage(
    imageData: string,
    options: PreprocessingOptions = {}
  ): Promise<tf.Tensor4D> {
    const {
      threshold = 0.5,
      normalize = true,
      removeNoise = true,
      segmentation = true
    } = options;

    const img = new Image();
    img.src = imageData;
    await new Promise(resolve => img.onload = resolve);

    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d')!;
    
    ctx.drawImage(img, 0, 0, 200, 50);
    let processedImageData = ctx.getImageData(0, 0, 200, 50);

    if (removeNoise) {
      processedImageData = this.removeImageNoise(processedImageData);
    }

    if (segmentation) {
      processedImageData = this.segmentCharacters(processedImageData);
    }

    let tensor = tf.browser.fromPixels(processedImageData, 1);

    if (normalize) {
      tensor = tensor.toFloat().div(255.0);
    }

    if (threshold !== null) {
      tensor = tensor.greater(threshold).toFloat();
    }

    return tensor.expandDims(0) as tf.Tensor4D;
  }

  private removeImageNoise(imageData: ImageData): ImageData {
    const pixels = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const result = new ImageData(width, height);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        let sum = 0;
        let count = 0;

        // Apply median filter
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const neighborIdx = ((y + dy) * width + (x + dx)) * 4;
            sum += pixels[neighborIdx];
            count++;
          }
        }

        const avg = sum / count;
        result.data[idx] = avg;
        result.data[idx + 1] = avg;
        result.data[idx + 2] = avg;
        result.data[idx + 3] = 255;
      }
    }

    return result;
  }

  private segmentCharacters(imageData: ImageData): ImageData {
    // Simple character segmentation - can be enhanced based on specific needs
    return imageData;
  }

  async solveCaptcha(imageData: string): Promise<string> {
    if (!this.model) {
      throw new Error('Model not initialized');
    }

    const preprocessed = await this.preprocessImage(imageData, {
      threshold: 0.5,
      normalize: true,
      removeNoise: true,
      segmentation: true
    });

    const prediction = await this.model.predict(preprocessed) as tf.Tensor;
    const characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    
    const result = Array.from(await prediction.argMax(1).data())
      .map(index => characters[index])
      .join('');

    preprocessed.dispose();
    prediction.dispose();

    return result;
  }
}

export const customCaptchaSolver = CustomCaptchaSolver.getInstance();