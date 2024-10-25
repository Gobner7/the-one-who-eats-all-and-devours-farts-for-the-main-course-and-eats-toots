// Previous content remains the same, updating the auth methods

private async handleAuthCode(code: string): Promise<void> {
  try {
    // Use a proxy server or backend endpoint to handle token exchange
    const tokenResponse = await fetch('http://localhost:3000/auth/youtube/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for tokens');
    }

    const data = await tokenResponse.json();
    
    this.authState = {
      isAuthenticated: true,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + (data.expires_in * 1000)
    };

    this.saveAuthState();
    this.emit('authenticated');

    // Redirect back to the main page
    window.location.href = '/';
  } catch (error) {
    console.error('Authentication failed:', error);
    this.emit('error', error);
  }
}

getAuthUrl(): string {
  const state = Math.random().toString(36).substring(7);
  localStorage.setItem('oauth_state', state);

  const params = new URLSearchParams({
    client_id: this.CLIENT_ID,
    redirect_uri: this.REDIRECT_URI,
    response_type: 'code',
    scope: this.SCOPES.join(' '),
    access_type: 'offline',
    state: state,
    include_granted_scopes: 'true',
    prompt: 'consent'
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}