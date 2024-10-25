import * as tf from '@tensorflow/tfjs';

export class ImageProcessor {
  private readonly IMAGE_SIZE = 224;

  async loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }

  async preprocessImage(image: HTMLImageElement): Promise<tf.Tensor4D> {
    return tf.tidy(() => {
      // Convert image to tensor
      const tensor = tf.browser.fromPixels(image)
        .toFloat()
        .div(255.0);
      
      // Advanced preprocessing
      const normalized = this.normalizeImage(tensor);
      const enhanced = this.enhanceFeatures(normalized);
      const resized = tf.image.resizeBilinear(enhanced, [this.IMAGE_SIZE, this.IMAGE_SIZE]);
      
      return resized.expandDims(0);
    });
  }

  private normalizeImage(tensor: tf.Tensor3D): tf.Tensor3D {
    return tf.tidy(() => {
      const mean = tf.mean(tensor, [0, 1], true);
      const std = tf.moments(tensor, [0, 1]).variance.sqrt();
      return tensor.sub(mean).div(std.add(tf.scalar(1e-5)));
    });
  }

  private enhanceFeatures(tensor: tf.Tensor3D): tf.Tensor3D {
    return tf.tidy(() => {
      // Enhance edges
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
      
      const edges = tf.sqrt(tf.add(tf.square(sobelX), tf.square(sobelY)));
      
      // Combine with original
      return tf.add(tensor, edges.squeeze([0])).div(tf.scalar(2));
    });
  }
}

export const imageProcessor = new ImageProcessor();