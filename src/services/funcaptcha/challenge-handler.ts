import { EventEmitter } from './event-emitter';
import { networkClient } from './network-client';
import { tokenPool } from './token-pool';
import { imageProcessor } from './image-processor';
import { RotationSolver } from './solvers/rotation-solver';
import { TileSolver } from './solvers/tile-solver';
import { MatchingSolver } from './solvers/matching-solver';

interface Challenge {
  id: string;
  type: 'rotation' | 'tile' | 'matching';
  imageUrl: string;
  sessionToken: string;
  gameVariant: string;
  gameType: number;
  wave: number;
  waves: number;
  increment?: number;
}

export class ChallengeHandler extends EventEmitter {
  private static instance: ChallengeHandler;
  private rotationSolver: RotationSolver;
  private tileSolver: TileSolver;
  private matchingSolver: MatchingSolver;

  private constructor() {
    super();
    this.rotationSolver = new RotationSolver();
    this.tileSolver = new TileSolver();
    this.matchingSolver = new MatchingSolver();
  }

  static getInstance(): ChallengeHandler {
    if (!ChallengeHandler.instance) {
      ChallengeHandler.instance = new ChallengeHandler();
    }
    return ChallengeHandler.instance;
  }

  async createChallenge(publicKey: string, username: string): Promise<Challenge> {
    const token = await tokenPool.getToken();
    
    const response = await networkClient.post('https://roblox-api.arkoselabs.com/fc/gfct/', {
      session_token: token,
      analytics_tier: 40,
      render_type: 'canvas',
      lang: 'en',
      data: { username }
    });

    const gameData = response.game_data;
    
    return {
      id: response.challengeID,
      type: this.determineChallengeType(gameData.game_type),
      imageUrl: gameData.image_url,
      sessionToken: token,
      gameVariant: gameData.game_variant,
      gameType: gameData.game_type,
      wave: gameData.wave,
      waves: gameData.waves,
      increment: gameData.angle_increment
    };
  }

  private determineChallengeType(gameType: number): 'rotation' | 'tile' | 'matching' {
    switch (gameType) {
      case 1:
        return 'rotation';
      case 3:
        return 'tile';
      case 4:
        return 'matching';
      default:
        return 'rotation';
    }
  }

  async getChallengeImage(challenge: Challenge): Promise<HTMLImageElement> {
    return imageProcessor.loadImage(challenge.imageUrl);
  }

  async solveChallenge(challenge: Challenge, image: HTMLImageElement): Promise<number | string> {
    switch (challenge.type) {
      case 'rotation':
        return this.rotationSolver.solve(image, challenge.increment || 51.4);
      case 'tile':
        return this.tileSolver.solve(image);
      case 'matching':
        return this.matchingSolver.solve(image);
      default:
        throw new Error(`Unsupported challenge type: ${challenge.type}`);
    }
  }

  async submitAnswer(challenge: Challenge, answer: number | string): Promise<{ solved: boolean; token?: string }> {
    const response = await networkClient.post('https://roblox-api.arkoselabs.com/fc/ca/', {
      session_token: challenge.sessionToken,
      answer: answer.toString(),
      game_token: challenge.id,
      game_type: challenge.gameType,
      wave_number: challenge.wave
    });

    return {
      solved: response.response === 'correct',
      token: response.token
    };
  }
}

export const challengeHandler = ChallengeHandler.getInstance();