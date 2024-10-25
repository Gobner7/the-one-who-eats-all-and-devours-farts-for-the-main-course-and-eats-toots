import { EventEmitter } from './event-emitter';

interface FunCaptchaSession {
  token: string;
  sessionId: string;
  timestamp: number;
  expiresAt: number;
}

export class SessionManager extends EventEmitter {
  private static instance: SessionManager;
  private sessions: Map<string, FunCaptchaSession> = new Map();
  private readonly SESSION_TIMEOUT = 10 * 60 * 1000; // 10 minutes

  private constructor() {
    super();
    this.startCleanupInterval();
  }

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  createSession(token: string): FunCaptchaSession {
    const session: FunCaptchaSession = {
      token,
      sessionId: crypto.randomUUID(),
      timestamp: Date.now(),
      expiresAt: Date.now() + this.SESSION_TIMEOUT
    };

    this.sessions.set(session.sessionId, session);
    return session;
  }

  getSession(sessionId: string): FunCaptchaSession | undefined {
    return this.sessions.get(sessionId);
  }

  removeSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [sessionId, session] of this.sessions.entries()) {
        if (session.expiresAt <= now) {
          this.sessions.delete(sessionId);
          this.emit('sessionExpired', sessionId);
        }
      }
    }, 60000); // Check every minute
  }

  clearAllSessions(): void {
    this.sessions.clear();
  }
}

export const sessionManager = SessionManager.getInstance();