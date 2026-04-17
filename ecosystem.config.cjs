/**
 * PM2 Ecosystem Configuration
 * For production deployment on a VPS or dedicated server.
 *
 * Usage:
 *   pm2 start ecosystem.config.cjs
 *   pm2 save
 *   pm2 startup  (to auto-start on boot)
 */

module.exports = {
  apps: [
    {
      name: "bastistil-inventory",
      script: "npm",
      args: "start",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
        MYSQL_HOST: "localhost",
        MYSQL_PORT: "3306",
        MYSQL_USER: "root",
        MYSQL_PASSWORD: "",
        MYSQL_DATABASE: "bmm_db",
        JWT_SECRET: "change-this-to-a-random-32-char-minimum-secret-key",
        SESSION_COOKIE_SECURE: "false",
      },
      // Logging
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-out.log",
      merge_logs: true,
      // Health check
      max_restarts: 10,
      min_uptime: "10s",
      restart_delay: 5000,
    },
  ],
};
