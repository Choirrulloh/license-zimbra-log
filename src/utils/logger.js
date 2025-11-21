const winston = require('winston');
const path = require('path');

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// JSON format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'saas-licensing-system' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: consoleFormat
    }),
    // Error log file
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Combined log file
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/combined.log'),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Security log file (for auth events)
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/security.log'),
      level: 'warn',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Add request logging helper
logger.logRequest = (req, message, meta = {}) => {
  logger.info(message, {
    ...meta,
    ip: req.ip || req.connection?.remoteAddress,
    method: req.method,
    path: req.path,
    userId: req.session?.userId,
    userAgent: req.headers?.['user-agent']
  });
};

// Add security event logging
logger.security = (event, req, meta = {}) => {
  logger.warn(`SECURITY: ${event}`, {
    ...meta,
    ip: req.ip || req.connection?.remoteAddress,
    method: req.method,
    path: req.path,
    userId: req.session?.userId,
    userAgent: req.headers?.['user-agent']
  });
};

// Add error logging helper
logger.logError = (error, req = null, meta = {}) => {
  const errorMeta = {
    ...meta,
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    }
  };

  if (req) {
    errorMeta.ip = req.ip || req.connection?.remoteAddress;
    errorMeta.method = req.method;
    errorMeta.path = req.path;
    errorMeta.userId = req.session?.userId;
  }

  logger.error(error.message, errorMeta);
};

module.exports = logger;
