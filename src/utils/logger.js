const winston = require('winston');
const path = require('path');

/**
 * Logger Configuration
 * Uses Winston for structured logging with timestamps and levels
 */
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
      
      // Add metadata if present (except stack which is handled above)
      const metaToLog = { ...meta };
      delete metaToLog.stack;
      
      if (Object.keys(metaToLog).length > 0) {
        log += ` ${JSON.stringify(metaToLog)}`;
      }
      
      return log;
    })
  ),
  transports: [
    // Console output for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `${timestamp} [${level}]: ${message}`;
        })
      )
    }),
    
    // File output for errors
    new winston.transports.File({ 
      filename: path.join('logs', 'error.log'), 
      level: 'error',
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 3,
    }),
    
    // File output for all logs
    new winston.transports.File({ 
      filename: path.join('logs', 'combined.log'),
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 3,
    }),
  ],
});

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '..', '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

module.exports = logger;
