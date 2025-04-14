module.exports = {
    apps: [
      {
        name: 'crm-frontend',
        script: 'serve',
        env: {
          PM2_SERVE_PATH: './dist',
          PM2_SERVE_PORT: 3001,
          PM2_SERVE_SPA: 'true',
          PM2_SERVE_HOMEPAGE: '/index.html'
        }
      },
      {
        name: 'crm-server',
        script: 'server/index.js',
        env: {
          PORT: 3000,
          NODE_ENV: 'production'
        }
      }
    ]
  };