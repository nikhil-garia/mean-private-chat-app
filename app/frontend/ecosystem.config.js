module.exports = {
  apps: [
    {
      name: 'angular-app',
      script: 'ng',
      args: 'serve --host praveentechsol.online --ssl true --ssl-cert /etc/letsencrypt/live/praveentechsol.online/fullchain.pem --ssl-key /etc/letsencrypt/live/praveentechsol.online/privkey.pem',
      watch: true,
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      }
    }
  ]
};

