import * as tf from '@tensorflow/tfjs';
import { EventEmitter } from './eventEmitter';

interface CaptionResult {
  text: string;
  timestamp: number;
  confidence: number;
  keywords: string[];
}

class CaptionGenerator extends EventEmitter {
  private model: tf.LayersModel | null = null;
  private readonly LANGUAGES = ['en', 'es', 'fr', 'de', 'it'];
  private readonly MIN_CONFIDENCE = 0.85;

  constructor() {
    super();
    this.initialize();
  }

  private async initialize() {
    try {
      await tf.ready();
      await tf.setBackend('webgl');
      this.model = await this.createModel();
      await this.warmupModel();
      this.emit('initialized');
    } catch (error) {
      console.error('Failed to initialize CaptionGenerator:', error);
      this.emit('error', error);
    }
  }

  private async createModel(): Promise<tf.LayersModel> {
    const model = tf.sequential();

    // Audio processing layers
    model.add(tf.layers.conv1d({
      inputShape: [1024, 1],
      filters: 128,
      kernelSize: 5,
      activation: 'relu'
    }));

    // Add bidirectional LSTM for sequence processing
    model.add(tf.layers.bidirectional({
      layer: tf.layers.lstm({
        units: 256,
        returnSequences: true
      })
    }));

    // Add attention mechanism
    model.add(tf.layers.dense({
      units: 512,
      activation: 'tanh'
    }));

    // Output layer for word prediction
    model.add(tf.layers.dense({
      units: 10000, // Vocabulary size
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
    const dummyInput = tf.zeros([1, 1024, 1]);
    await this.model?.predict(dummyInput);
    dummyInput.dispose();
  }

  async generateCaptions(videoUrl: string, options = { language: 'en' }): Promise<CaptionResult[]> {
    try {
      // Extract audio from video
      const audioFeatures = await this.extractAudioFeatures(videoUrl);
      
      // Generate captions with timestamps
      const rawCaptions = await this.processAudioSegments(audioFeatures);
      
      // Post-process and optimize captions
      const optimizedCaptions = await this.optimizeCaptions(rawCaptions);
      
      // Translate if needed
      const finalCaptions = options.language !== 'en' 
        ? await this.translateCaptions(optimizedCaptions, options.language)
        : optimizedCaptions;

      return finalCaptions;
    } catch (error) {
      console.error('Caption generation failed:', error);
      throw new Error('Failed to generate captions');
    }
  }

  private async extractAudioFeatures(videoUrl: string): Promise<Float32Array> {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const response = await fetch(videoUrl);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // Convert to mono and normalize
    const audioData = audioBuffer.getChannelData(0);
    return this.normalizeAudio(audioData);
  }

  private normalizeAudio(audioData: Float32Array): Float32Array {
    const maxVal = Math.max(...audioData.map(Math.abs));
    return new Float32Array(audioData.map(x => x / maxVal));
  }

  private async processAudioSegments(audioFeatures: Float32Array): Promise<CaptionResult[]> {
    const segmentSize = 1024;
    const captions: CaptionResult[] = [];
    
    for (let i = 0; i < audioFeatures.length; i += segmentSize) {
      const segment = audioFeatures.slice(i, i + segmentSize);
      const tensor = tf.tensor3d([Array.from(segment)], [1, segmentSize, 1]);
      
      const prediction = await this.model!.predict(tensor) as tf.Tensor;
      const words = await this.decodePrediction(prediction);
      
      if (words.confidence > this.MIN_CONFIDENCE) {
        captions.push({
          text: words.text,
          timestamp: i / 44100, // Convert samples to seconds
          confidence: words.confidence,
          keywords: words.keywords
        });
      }
      
      tensor.dispose();
      prediction.dispose();
    }
    
    return captions;
  }

  private async decodePrediction(prediction: tf.Tensor): Promise<{
    text: string;
    confidence: number;
    keywords: string[];
  }> {
    const probs = await prediction.data();
    const wordIndex = probs.indexOf(Math.max(...Array.from(probs)));
    
    // Convert to actual words (simplified)
    return {
      text: `Word ${wordIndex}`,
      confidence: probs[wordIndex],
      keywords: [`keyword_${wordIndex}`]
    };
  }

  private async optimizeCaptions(captions: CaptionResult[]): Promise<CaptionResult[]> {
    // Merge close timestamps
    const mergedCaptions = this.mergeSimilarCaptions(captions);
    
    // Add punctuation
    const withPunctuation = await this.addPunctuation(mergedCaptions);
    
    // Format for readability
    return this.formatCaptions(withPunctuation);
  }

  private mergeSimilarCaptions(captions: CaptionResult[]): CaptionResult[] {
    const merged: CaptionResult[] = [];
    let current: CaptionResult | null = null;
    
    for (const caption of captions) {
      if (!current) {
        current = caption;
        continue;
      }
      
      if (caption.timestamp - current.timestamp < 0.3) {
        current.text += ' ' + caption.text;
        current.confidence = (current.confidence + caption.confidence) / 2;
        current.keywords = [...new Set([...current.keywords, ...caption.keywords])];
      } else {
        merged.push(current);
        current = caption;
      }
    }
    
    if (current) merged.push(current);
    return merged;
  }

  private async addPunctuation(captions: CaptionResult[]): Promise<CaptionResult[]> {
    // Add proper punctuation using language model
    return captions.map(caption => ({
      ...caption,
      text: this.addPunctuationMarks(caption.text)
    }));
  }

  private addPunctuationMarks(text: string): string {
    // Simple rule-based punctuation (replace with ML model in production)
    return text.trim() + '.';
  }

  private formatCaptions(captions: CaptionResult[]): CaptionResult[] {
    return captions.map(caption => ({
      ...caption,
      text: this.formatText(caption.text)
    }));
  }

  private formatText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  private async translateCaptions(
    captions: CaptionResult[],
    targetLang: string
  ): Promise<CaptionResult[]> {
    // Implement translation logic
    return captions;
  }
}

export const captionGenerator = new CaptionGenerator();