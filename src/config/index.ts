export const config = {
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
    timeout: 30000
  },
  markets: {
    steam: {
      rateLimit: {
        requests: 100,
        interval: 60000 // 1 minute
      }
    },
    buff: {
      rateLimit: {
        requests: 60,
        interval: 60000
      }
    },
    skinport: {
      rateLimit: {
        requests: 120,
        interval: 60000
      }
    }
  },
  proxy: {
    enabled: true,
    rotationInterval: 300000, // 5 minutes
    providers: [
      {
        host: import.meta.env.VITE_PROXY_HOST_1,
        port: import.meta.env.VITE_PROXY_PORT_1,
        auth: {
          username: import.meta.env.VITE_PROXY_USERNAME_1,
          password: import.meta.env.VITE_PROXY_PASSWORD_1
        }
      }
    ]
  }
};