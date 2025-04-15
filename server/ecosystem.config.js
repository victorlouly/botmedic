module.exports = {
    apps: [
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