import { EventEmitter } from '../eventEmitter';

interface AuthState {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: {
    id: string;
    email: string;
    name: string;
    picture: string;
  } | null;
}

class GoogleAuthService extends EventEmitter {
  private static instance: GoogleAuthService;
  private authState: AuthState | null = null;
  private readonly CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  private readonly SCOPES = [
    'https://www.googleapis.com/auth/youtube',
    'https://www.googleapis.com/auth/youtube.force-ssl',
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtubepartner'
  ];

  private constructor() {
    super();
    this.loadAuthState();
  }

  static getInstance(): GoogleAuthService {
    if (!GoogleAuthService.instance) {
      GoogleAuthService.instance = new GoogleAuthService();
    }
    return GoogleAuthService.instance;
  }

  async initiate(): Promise<void> {
    const state = crypto.randomUUID();
    localStorage.setItem('oauth_state', state);

    const params = new URLSearchParams({
      client_id: this.CLIENT_ID,
      redirect_uri: `${window.location.origin}/auth/callback`,
      response_type: 'code',
      scope: this.SCOPES.join(' '),
      access_type: 'offline',
      state,
      prompt: 'consent',
      include_granted_scopes: 'true'
    });

    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  async handleCallback(code: string, state: string): Promise<void> {
    const savedState = localStorage.getItem('oauth_state');
    if (state !== savedState) {
      throw new Error('Invalid state parameter');
    }

    try {
      const response = await fetch('/api/auth/google/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });

      if (!response.ok) {
        throw new Error('Token exchange failed');
      }

      const data = await response.json();
      
      this.authState = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + (data.expires_in * 1000),
        user: await this.fetchUserInfo(data.access_token)
      };

      this.saveAuthState();
      this.emit('authenticated', this.authState.user);

    } catch (error) {
      console.error('Authentication failed:', error);
      throw error;
    }
  }

  private async fetchUserInfo(accessToken: string) {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user info');
    }

    return response.json();
  }

  async refreshAccessToken(): Promise<void> {
    if (!this.authState?.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch('/api/auth/google/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: this.authState.refreshToken })
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    
    this.authState = {
      ...this.authState,
      accessToken: data.access_token,
      expiresAt: Date.now() + (data.expires_in * 1000)
    };

    this.saveAuthState();
  }

  getAccessToken(): string {
    if (!this.authState?.accessToken) {
      throw new Error('Not authenticated');
    }

    if (Date.now() >= this.authState.expiresAt) {
      this.refreshAccessToken();
    }

    return this.authState.accessToken;
  }

  isAuthenticated(): boolean {
    return Boolean(this.authState?.accessToken);
  }

  getCurrentUser() {
    return this.authState?.user || null;
  }

  logout(): void {
    this.authState = null;
    localStorage.removeItem('auth_state');
    this.emit('logout');
  }

  private loadAuthState(): void {
    const saved = localStorage.getItem('auth_state');
    if (saved) {
      this.authState = JSON.parse(saved);
    }
  }

  private saveAuthState(): void {
    localStorage.setItem('auth_state', JSON.stringify(this.authState));
  }
}

export const googleAuthService = GoogleAuthService.getInstance();