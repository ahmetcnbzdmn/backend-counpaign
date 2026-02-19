const fs = require('fs');
const path = require('path');

// ===== Simple Structured Logger =====
// JSON-format logs with timestamp, level, and message
// Writes to both console and file

const LOG_DIR = path.join(__dirname, '../../logs');
const LOG_FILE = path.join(LOG_DIR, 'app.log');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const CURRENT_LEVEL = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

function formatLog(level, message, meta = {}) {
    return JSON.stringify({
        timestamp: new Date().toISOString(),
        level,
        message,
        ...meta,
        pid: process.pid,
    });
}

function writeLog(level, message, meta) {
    if (LOG_LEVELS[level] > LOG_LEVELS[CURRENT_LEVEL]) return;

    const line = formatLog(level, message, meta);

    // Console output (colorized)
    const colors = { error: '\x1b[31m', warn: '\x1b[33m', info: '\x1b[36m', debug: '\x1b[90m' };
    const reset = '\x1b[0m';
    console.log(`${colors[level] || ''}${line}${reset}`);

    // File output (append)
    try {
        fs.appendFileSync(LOG_FILE, line + '\n');
    } catch (err) {
        // Silently fail on file write errors
    }

    // Rotate log file if > 10MB
    try {
        const stats = fs.statSync(LOG_FILE);
        if (stats.size > 10 * 1024 * 1024) {
            const rotated = LOG_FILE + '.' + Date.now();
            fs.renameSync(LOG_FILE, rotated);

            // Keep only last 5 rotated files
            const files = fs.readdirSync(LOG_DIR)
                .filter(f => f.startsWith('app.log.'))
                .sort()
                .reverse();
            files.slice(5).forEach(f => {
                try { fs.unlinkSync(path.join(LOG_DIR, f)); } catch (e) { }
            });
        }
    } catch (err) { }
}

const logger = {
    error: (msg, meta) => writeLog('error', msg, meta),
    warn: (msg, meta) => writeLog('warn', msg, meta),
    info: (msg, meta) => writeLog('info', msg, meta),
    debug: (msg, meta) => writeLog('debug', msg, meta),
};

module.exports = logger;
