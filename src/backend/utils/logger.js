// ==========================================
// © bighosting by bigmanjtech™
// Logger Utility – Console + File Logging
// ==========================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOG_DIR = path.join(__dirname, '../../../logs');

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// ==========================================
// Get Current Timestamp
// ==========================================

function getTimestamp() {
  return new Date().toISOString();
}

// ==========================================
// Write to Log File
// ==========================================

function writeToFile(level, message, meta = {}) {
  const logEntry = {
    timestamp: getTimestamp(),
    level: level,
    message: message,
    meta: meta,
  };

  const logLine = JSON.stringify(logEntry) + '\n';
  const date = new Date().toISOString().split('T')[0];
  const logFile = path.join(LOG_DIR, `${date}.log`);

  try {
    fs.appendFileSync(logFile, logLine);
  } catch (error) {
    console.error('❌ Failed to write log file:', error.message);
  }
}

// ==========================================
// Log Functions
// ==========================================

export function info(message, meta = {}) {
  console.log(`✅ ${getTimestamp()} [INFO] ${message}`);
  writeToFile('INFO', message, meta);
}

export function warn(message, meta = {}) {
  console.warn(`⚠️ ${getTimestamp()} [WARN] ${message}`);
  writeToFile('WARN', message, meta);
}

export function error(message, meta = {}) {
  console.error(`❌ ${getTimestamp()} [ERROR] ${message}`);
  writeToFile('ERROR', message, meta);
}

export function debug(message, meta = {}) {
  if (process.env.NODE_ENV === 'development') {
    console.debug(`🔍 ${getTimestamp()} [DEBUG] ${message}`);
  }
  writeToFile('DEBUG', message, meta);
}

export function http(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const log = `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`;
    if (res.statusCode >= 400) {
      error(log, { ip: req.ip, userAgent: req.get('user-agent') });
    } else {
      info(log, { ip: req.ip, userAgent: req.get('user-agent') });
    }
  });
  next();
}

export default {
  info,
  warn,
  error,
  debug,
  http,
};