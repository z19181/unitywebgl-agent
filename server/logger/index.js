// server/logger/index.js — v0.3.0 Structured Logger
// Environment: LOG_LEVEL=debug|info|warn|error (default: info)
//              LOG_FORMAT=json|pretty (default: pretty)

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const level = LOG_LEVELS[process.env.LOG_LEVEL] ?? LOG_LEVELS.info;
const format = process.env.LOG_FORMAT || 'pretty';
const LOG_PREFIX = process.env.LOG_PREFIX || 'partygame';

function emit(lvl, msg, extra = {}) {
  if (LOG_LEVELS[lvl] < level) return;

  const entry = {
    ts: new Date().toISOString(),
    service: LOG_PREFIX,
    level: lvl,
    msg,
    ...extra,
  };

  if (format === 'json') {
    process.stdout.write(JSON.stringify(entry) + '\n');
  } else {
    const ts = entry.ts.split('T')[1].split('.')[0];
    const tags = extra.roomId ? `[room=${extra.roomId}]` : '';
    const piTag = extra.playerIndex !== undefined ? `[PI=${extra.playerIndex}]` : '';
    const wsId = extra.wsId ? `[${extra.wsId.slice(0, 8)}]` : '';
    process.stdout.write(`${ts} ${lvl.toUpperCase().padEnd(5)} ${wsId}${tags}${piTag} ${msg}\n`);
  }
}

const log = {
  debug: (msg, extra) => emit('debug', msg, extra),
  info:  (msg, extra) => emit('info',  msg, extra),
  warn:  (msg, extra) => emit('warn',  msg, extra),
  error: (msg, extra) => emit('error', msg, extra),
  metric: (msg, extra) => emit('info', msg, { ...extra, kind: 'metric' }),
};

module.exports = log;
