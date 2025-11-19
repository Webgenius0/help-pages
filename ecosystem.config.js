/**
 * PM2 Ecosystem Configuration for Next.js on CloudPanel
 * 
 * This file configures PM2 to run your Next.js application in production.
 * 
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 save
 *   pm2 startup
 */

module.exports = {
  apps: [{
    name: 'helppages',
    script: 'npm',
    args: 'start',
    cwd: '/home/cloudpanel/htdocs/helppages.ai', // Update with your actual path
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000  // Update with your CloudPanel app port
    },
    // Logging
    error_file: '/var/log/pm2/helppages-error.log',
    out_file: '/var/log/pm2/helppages-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
    // Auto-restart settings
    autorestart: true,
    watch: false, // Set to true for development, false for production
    max_memory_restart: '1G',
    
    // Advanced settings
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000,
    
    // Environment variables (can also be set in CloudPanel UI)
    // These will be merged with system environment variables
    env_production: {
      NODE_ENV: 'production',
    }
  }]
};

