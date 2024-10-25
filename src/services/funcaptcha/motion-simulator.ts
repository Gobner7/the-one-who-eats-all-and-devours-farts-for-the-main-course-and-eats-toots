import { EventEmitter } from './event-emitter';

export class MotionSimulator extends EventEmitter {
  private static instance: MotionSimulator;
  private motionData: any[] = [];
  private isRecording = false;

  private constructor() {
    super();
  }

  static getInstance(): MotionSimulator {
    if (!MotionSimulator.instance) {
      MotionSimulator.instance = new MotionSimulator();
    }
    return MotionSimulator.instance;
  }

  async simulateHumanBehavior() {
    this.startRecording();
    
    // Simulate mouse movements
    await this.simulateMouseMovements();
    
    // Simulate scrolling
    await this.simulateScrolling();
    
    // Simulate keyboard events
    await this.simulateKeyboardEvents();
    
    this.stopRecording();
  }

  private startRecording() {
    this.isRecording = true;
    this.motionData = [];
    
    // Record mouse movements
    document.addEventListener('mousemove', this.recordMouseMove);
    
    // Record scroll events
    document.addEventListener('scroll', this.recordScroll);
    
    // Record keyboard events
    document.addEventListener('keydown', this.recordKeyboard);
  }

  private stopRecording() {
    this.isRecording = false;
    
    document.removeEventListener('mousemove', this.recordMouseMove);
    document.removeEventListener('scroll', this.recordScroll);
    document.removeEventListener('keydown', this.recordKeyboard);
  }

  private recordMouseMove = (e: MouseEvent) => {
    if (!this.isRecording) return;
    
    this.motionData.push({
      type: 'mouse',
      x: e.clientX,
      y: e.clientY,
      timestamp: Date.now()
    });
  };

  private recordScroll = (e: Event) => {
    if (!this.isRecording) return;
    
    this.motionData.push({
      type: 'scroll',
      scrollY: window.scrollY,
      timestamp: Date.now()
    });
  };

  private recordKeyboard = (e: KeyboardEvent) => {
    if (!this.isRecording) return;
    
    this.motionData.push({
      type: 'keyboard',
      key: e.key,
      timestamp: Date.now()
    });
  };

  private async simulateMouseMovements() {
    const points = this.generateBezierCurve(
      { x: 0, y: 0 },
      { x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight },
      5
    );

    for (const point of points) {
      const event = new MouseEvent('mousemove', {
        clientX: point.x,
        clientY: point.y,
        bubbles: true
      });
      document.dispatchEvent(event);
      await this.delay(Math.random() * 50 + 50);
    }
  }

  private async simulateScrolling() {
    const scrollAmount = Math.random() * 500;
    const steps = 10;
    
    for (let i = 0; i < steps; i++) {
      window.scrollBy(0, scrollAmount / steps);
      await this.delay(Math.random() * 100 + 50);
    }
  }

  private async simulateKeyboardEvents() {
    const keys = ['Tab', 'ArrowDown', 'ArrowUp'];
    
    for (const key of keys) {
      const event = new KeyboardEvent('keydown', {
        key,
        bubbles: true
      });
      document.dispatchEvent(event);
      await this.delay(Math.random() * 200 + 100);
    }
  }

  private generateBezierCurve(start: {x: number, y: number}, end: {x: number, y: number}, points: number) {
    const result = [];
    const cp1 = {
      x: start.x + (Math.random() * 100 - 50),
      y: start.y + (Math.random() * 100 - 50)
    };
    const cp2 = {
      x: end.x + (Math.random() * 100 - 50),
      y: end.y + (Math.random() * 100 - 50)
    };
    
    for (let i = 0; i <= points; i++) {
      const t = i / points;
      result.push({
        x: Math.pow(1-t, 3) * start.x + 
           3 * Math.pow(1-t, 2) * t * cp1.x + 
           3 * (1-t) * Math.pow(t, 2) * cp2.x + 
           Math.pow(t, 3) * end.x,
        y: Math.pow(1-t, 3) * start.y + 
           3 * Math.pow(1-t, 2) * t * cp1.y + 
           3 * (1-t) * Math.pow(t, 2) * cp2.y + 
           Math.pow(t, 3) * end.y
      });
    }
    
    return result;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getMotionData() {
    return this.motionData;
  }
}

export const motionSimulator = MotionSimulator.getInstance();