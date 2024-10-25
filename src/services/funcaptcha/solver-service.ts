import { advancedFunCaptchaAPI } from './advanced-api';
import { robloxFunCaptchaSolver } from './roblox-solver';
import { EventEmitter } from './event-emitter';

interface SolveOptions {
  pkey: string;
  surl?: string;
  site: string;
  proxy?: string;
  maxRetries?: number;
  timeout?: number;
}

interface SolveResult {
  success: boolean;
  token?: string;
  error?: string;
  solveTime: number;
  attempts: number;
}

export class SolverService extends EventEmitter {
  private static instance: SolverService;
  private isProcessing = false;

  private constructor() {
    super();
  }

  static getInstance(): SolverService {
    if (!SolverService.instance) {
      SolverService.instance = new SolverService();
    }
    return SolverService.instance;
  }

  async solve(options: SolveOptions): Promise<SolveResult> {
    const startTime = performance.now();
    const maxRetries = options.maxRetries || 3;
    let attempts = 0;

    while (attempts < maxRetries) {
      attempts++;
      
      try {
        const { token, session_token } = await advancedFunCaptchaAPI.getToken({
          pkey: options.pkey,
          surl: options.surl,
          site: options.site,
          proxy: options.proxy
        });

        const challenge = await advancedFunCaptchaAPI.getChallenge(session_token);
        
        const solveResult = await robloxFunCaptchaSolver.solve(challenge.imageUrl);
        
        if (solveResult.success) {
          const isCorrect = await advancedFunCaptchaAPI.submitAnswer(
            session_token,
            solveResult.token!,
            challenge
          );

          if (isCorrect) {
            return {
              success: true,
              token,
              solveTime: performance.now() - startTime,
              attempts
            };
          }
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Attempt ${attempts} failed:`, error);
        
        if (attempts === maxRetries) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            solveTime: performance.now() - startTime,
            attempts
          };
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
      }
    }

    return {
      success: false,
      error: 'Max retries exceeded',
      solveTime: performance.now() - startTime,
      attempts
    };
  }

  async startBatchSolving(
    comboList: string[],
    options: SolveOptions
  ): Promise<void> {
    if (this.isProcessing) {
      throw new Error('Already processing');
    }

    this.isProcessing = true;
    
    for (const combo of comboList) {
      if (!this.isProcessing) break;

      try {
        const result = await this.solve(options);
        this.emit('result', { combo, ...result });
      } catch (error) {
        this.emit('error', { combo, error });
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    this.isProcessing = false;
    this.emit('complete');
  }

  stopProcessing(): void {
    this.isProcessing = false;
  }
}

export const solverService = SolverService.getInstance();