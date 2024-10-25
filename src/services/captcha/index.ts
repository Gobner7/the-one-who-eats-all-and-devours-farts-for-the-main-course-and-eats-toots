import { CustomCaptchaSolver } from './custom-solver';
import { config } from '../../config';

export class CaptchaSolver {
  private static instance: CaptchaSolver;
  private solver: CustomCaptchaSolver;

  private constructor() {
    this.solver = CustomCaptchaSolver.getInstance();
  }

  static getInstance(): CaptchaSolver {
    if (!CaptchaSolver.instance) {
      CaptchaSolver.instance = new CaptchaSolver();
    }
    return CaptchaSolver.instance;
  }

  async solveCaptcha(imageData: string): Promise<string> {
    try {
      return await this.solver.solveCaptcha(imageData);
    } catch (error) {
      console.error('Failed to solve captcha:', error);
      throw new Error('Captcha solving failed');
    }
  }
}

export const captchaSolver = CaptchaSolver.getInstance();