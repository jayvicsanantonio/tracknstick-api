import winston from 'winston';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Add colors to winston
winston.addColors(colors);

// Define the format for logs
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Determine if we're in a Cloudflare Workers environment
const isCloudflareWorker = 
  typeof navigator !== 'undefined' && 
  navigator.userAgent === 'Cloudflare-Workers';

// This determines if we're in a browser-like environment where File transport won't work
const isBrowserEnv = 
  typeof window !== 'undefined' || 
  isCloudflareWorker || 
  typeof process === 'undefined';

// Create the logger with appropriate transports
const logger = winston.createLogger({
  level: process.env?.NODE_ENV === 'development' ? 'debug' : 'info',
  levels,
  format,
  transports: [
    // Always use console transport
    new winston.transports.Console()
  ],
});

// Create a stream object for HTTP logging middleware
logger.stream = {
  write: (message) => logger.http(message.trim()),
};

export default logger;
