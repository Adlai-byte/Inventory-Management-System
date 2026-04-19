module.exports = {
  apps: [
    {
      name: "batistil-app",
      script: "npm",
      args: "run start:inner",
      shell: true,
      env: { NODE_ENV: "production" },
      max_restarts: 10,
      restart_delay: 3000,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
    {
      name: "batistil-proxy",
      script: "https-proxy.js",
      env: { NODE_ENV: "production" },
      max_restarts: 10,
      restart_delay: 3000,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
