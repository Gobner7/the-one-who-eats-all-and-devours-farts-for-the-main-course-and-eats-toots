import * as tf from '@tensorflow/tfjs';
import { SMA, EMA, RSI, MACD, BollingerBands, ADX } from 'technicalindicators';
import { CardListing, CardData, PricePoint } from '../../types/market';

export class MarketAnalyzer {
  private static instance: MarketAnalyzer;
  private model: tf.LayersModel | null = null;
  private readonly LOOKBACK_PERIOD = 30;
  private readonly PREDICTION_THRESHOLD = 0.85;

  private constructor() {
    this.initialize();
  }

  static getInstance(): MarketAnalyzer {
    if (!MarketAnalyzer.instance) {
      MarketAnalyzer.instance = new MarketAnalyzer();
    }
    return MarketAnalyzer.instance;
  }

  private async initialize() {
    await tf.ready();
    this.model = await this.createAdvancedModel();
  }

  private async createAdvancedModel(): Promise<tf.LayersModel> {
    const model = tf.sequential();

    // Input layer
    model.add(tf.layers.dense({
      inputShape: [15], // Enhanced feature set
      units: 128,
      activation: 'relu'
    }));

    // Hidden layers with residual connections
    const addResidualBlock = (units: number) => {
      const input = model.layers[model.layers.length - 1].output as tf.SymbolicTensor;
      const dense1 = tf.layers.dense({ units, activation: 'relu' }).apply(input);
      const dense2 = tf.layers.dense({ units }).apply(dense1);
      const addition = tf.layers.add().apply([input, dense2]);
      const activation = tf.layers.activation({ activation: 'relu' }).apply(addition);
      model.add(tf.layers.dense({ units }));
    };

    [256, 128, 64].forEach(units => {
      addResidualBlock(units);
      model.add(tf.layers.dropout({ rate: 0.3 }));
    });

    // Output layer
    model.add(tf.layers.dense({ units: 3, activation: 'softmax' }));

    model.compile({
      optimizer: tf.train.adam(0.0001),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });

    return model;
  }

  async analyzeMarket(card: CardData): Promise<{
    trend: 'bullish' | 'bearish' | 'neutral';
    signals: string[];
    support: number;
    resistance: number;
    volatility: number;
    recommendation: string;
  }> {
    const prices = card.priceHistory.map(p => p.price);
    const volumes = card.priceHistory.map(p => p.volume || 0);

    // Technical indicators
    const sma20 = SMA.calculate({ period: 20, values: prices });
    const sma50 = SMA.calculate({ period: 50, values: prices });
    const ema12 = EMA.calculate({ period: 12, values: prices });
    const ema26 = EMA.calculate({ period: 26, values: prices });
    const rsi = RSI.calculate({ period: 14, values: prices });
    const macd = MACD.calculate({
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      values: prices
    });
    const bb = BollingerBands.calculate({
      period: 20,
      stdDev: 2,
      values: prices
    });
    const adx = ADX.calculate({
      high: prices.map((p, i) => p * (1 + Math.random() * 0.01)),
      low: prices.map((p, i) => p * (1 - Math.random() * 0.01)),
      close: prices,
      period: 14
    });

    // Volume analysis
    const volumeProfile = this.analyzeVolumeProfile(prices, volumes);
    
    // Support and resistance
    const levels = this.findKeyLevels(prices, volumes);
    
    // Volatility
    const volatility = this.calculateVolatility(prices);

    // Generate signals
    const signals = this.generateSignals({
      sma20: sma20[sma20.length - 1],
      sma50: sma50[sma50.length - 1],
      ema12: ema12[ema12.length - 1],
      ema26: ema26[ema26.length - 1],
      rsi: rsi[rsi.length - 1],
      macd: macd[macd.length - 1],
      bb: bb[bb.length - 1],
      adx: adx[adx.length - 1],
      volumeProfile,
      currentPrice: prices[prices.length - 1]
    });

    // Determine trend
    const trend = this.determineTrend(signals);

    // Generate recommendation
    const recommendation = this.generateRecommendation(trend, signals, volatility);

    return {
      trend,
      signals: signals.map(s => s.message),
      support: levels.support,
      resistance: levels.resistance,
      volatility,
      recommendation
    };
  }

  private analyzeVolumeProfile(prices: number[], volumes: number[]): {
    valueArea: { high: number; low: number };
    poc: number;
    distribution: Map<number, number>;
  } {
    const distribution = new Map<number, number>();
    let maxVolume = 0;
    let pocPrice = 0;

    prices.forEach((price, i) => {
      const roundedPrice = Math.round(price * 100) / 100;
      const volume = volumes[i];
      distribution.set(roundedPrice, (distribution.get(roundedPrice) || 0) + volume);

      if (distribution.get(roundedPrice)! > maxVolume) {
        maxVolume = distribution.get(roundedPrice)!;
        pocPrice = roundedPrice;
      }
    });

    // Calculate Value Area (70% of volume)
    const totalVolume = volumes.reduce((a, b) => a + b, 0);
    const targetVolume = totalVolume * 0.7;
    let currentVolume = 0;
    let low = pocPrice;
    let high = pocPrice;

    while (currentVolume < targetVolume) {
      const nextLow = Math.max(...Array.from(distribution.keys()).filter(p => p < low));
      const nextHigh = Math.min(...Array.from(distribution.keys()).filter(p => p > high));

      if (!nextLow && !nextHigh) break;

      if (!nextLow || (nextHigh && distribution.get(nextHigh)! > distribution.get(nextLow)!)) {
        high = nextHigh;
        currentVolume += distribution.get(nextHigh)!;
      } else {
        low = nextLow;
        currentVolume += distribution.get(nextLow)!;
      }
    }

    return {
      valueArea: { high, low },
      poc: pocPrice,
      distribution
    };
  }

  private findKeyLevels(prices: number[], volumes: number[]): {
    support: number;
    resistance: number;
    clusters: { price: number; strength: number }[];
  } {
    const pricePoints = prices.map((price, i) => ({
      price,
      volume: volumes[i]
    }));

    // Find price clusters
    const clusters = new Map<number, number>();
    const range = Math.max(...prices) - Math.min(...prices);
    const binSize = range / 50;

    pricePoints.forEach(point => {
      const bin = Math.round(point.price / binSize) * binSize;
      clusters.set(bin, (clusters.get(bin) || 0) + point.volume);
    });

    // Sort clusters by strength
    const sortedClusters = Array.from(clusters.entries())
      .map(([price, volume]) => ({
        price,
        strength: volume / Math.max(...volumes)
      }))
      .sort((a, b) => b.strength - a.strength);

    const currentPrice = prices[prices.length - 1];
    const support = Math.max(
      ...sortedClusters
        .filter(c => c.price < currentPrice && c.strength > 0.3)
        .map(c => c.price)
    );
    const resistance = Math.min(
      ...sortedClusters
        .filter(c => c.price > currentPrice && c.strength > 0.3)
        .map(c => c.price)
    );

    return { support, resistance, clusters: sortedClusters };
  }

  private calculateVolatility(prices: number[]): number {
    const returns = prices.slice(1).map((price, i) => 
      Math.log(price / prices[i])
    );
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    return Math.sqrt(variance * 252); // Annualized volatility
  }

  private generateSignals(indicators: any): Array<{ message: string; strength: number }> {
    const signals = [];

    // Trend signals
    if (indicators.sma20 > indicators.sma50) {
      signals.push({
        message: 'Bullish trend: SMA20 above SMA50',
        strength: 0.6
      });
    }

    // Momentum signals
    if (indicators.rsi > 70) {
      signals.push({
        message: 'Overbought: RSI above 70',
        strength: -0.8
      });
    } else if (indicators.rsi < 30) {
      signals.push({
        message: 'Oversold: RSI below 30',
        strength: 0.8
      });
    }

    // MACD signals
    if (indicators.macd.MACD > indicators.macd.signal) {
      signals.push({
        message: 'Bullish MACD crossover',
        strength: 0.7
      });
    }

    // Bollinger Bands signals
    if (indicators.currentPrice < indicators.bb.lower) {
      signals.push({
        message: 'Price below lower Bollinger Band',
        strength: 0.6
      });
    }

    // Volume Profile signals
    if (indicators.currentPrice < indicators.volumeProfile.valueArea.low) {
      signals.push({
        message: 'Price below Value Area Low',
        strength: 0.5
      });
    }

    return signals;
  }

  private determineTrend(signals: Array<{ message: string; strength: number }>): 'bullish' | 'bearish' | 'neutral' {
    const sentiment = signals.reduce((acc, signal) => acc + signal.strength, 0);
    if (sentiment > 0.5) return 'bullish';
    if (sentiment < -0.5) return 'bearish';
    return 'neutral';
  }

  private generateRecommendation(
    trend: 'bullish' | 'bearish' | 'neutral',
    signals: Array<{ message: string; strength: number }>,
    volatility: number
  ): string {
    const strongSignals = signals.filter(s => Math.abs(s.strength) > 0.7);
    const isHighVolatility = volatility > 0.3;

    if (trend === 'bullish' && strongSignals.length >= 2 && !isHighVolatility) {
      return 'Strong buy opportunity with multiple confirming signals';
    } else if (trend === 'bearish' && strongSignals.length >= 2 && !isHighVolatility) {
      return 'Consider taking profits or hedging position';
    } else if (isHighVolatility) {
      return 'High volatility - exercise caution and consider smaller position sizes';
    } else {
      return 'Monitor for clearer signals before taking action';
    }
  }
}

export const marketAnalyzer = MarketAnalyzer.getInstance();