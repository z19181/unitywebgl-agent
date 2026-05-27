// Secret scanner for agent memory store
// Scans text for API keys, tokens, passwords, private keys, and other secrets
// Part of v1.3.0 Phase B.0

import crypto from 'crypto';

// ──────────────────────────────────────────────────────────────
// Secret Pattern Definitions
// ──────────────────────────────────────────────────────────────

// Patterns that MUST never be stored in memories
const SECRET_PATTERNS = [
  // OpenAI and generic API keys
  { type: 'OPENAI_KEY',       regex: /sk-(?:proc-)?[A-Za-z0-9_-]{20,}/g,       falsePositive: ['sk-proc', 'sk-abc'] },
  { type: 'OPENAI_KEY',       regex: /\bskl-[A-Za-z0-9_-]{20,}\b/g,             falsePositive: [] },
  
  // Generic API keys
  { type: 'API_KEY',          regex: /(?:api[_-]?key|apikey|APIKEY)\s*[=:]\s*['"]?[\w\-\.]{16,}/gi, falsePositive: ['api_key='] },
  
  // Bearer tokens
  { type: 'BEARER_TOKEN',     regex: /\bBearer\s+[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, falsePositive: [] },
  
  // JWT tokens (three-part structure with base64) — must be BEFORE AUTH_TOKEN to avoid token: false positive
  { type: 'JWT_TOKEN',        regex: /\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, falsePositive: [] },
  
  // Auth tokens — generic 'token' keyword uses only = not : to avoid false positives on "Token: ..."
  { type: 'AUTH_TOKEN',      regex: /\b(?:access_token|auth_token)\s*[=:]\s*['"]?[A-Za-z0-9_\-]{20,}/gi, falsePositive: [] },  
  { type: 'AUTH_TOKEN',      regex: /\btoken\s*=\s*['"]?[A-Za-z0-9_\-]{20,}/gi, falsePositive: [] },
  
  // Database connection strings with passwords
  { type: 'DB_CONNECTION',   regex: /(?:postgres|mysql|mongodb|redis):\/\/[^\s:]+:[^\s@]+@[^\s]+/g, falsePositive: [] },
  
  // AWS credentials
  { type: 'AWS_KEY',         regex: /\bAKIA[A-Z0-9]{16}\b/g,                     falsePositive: [] },
  { type: 'AWS_KEY',         regex: /(?:aws[_-]?access[_-]?key[_-]?id)\s*[=:]\s*['"]?AKIA[A-Z0-9]+\b/gi, falsePositive: [] },
  
  // GitHub tokens
  { type: 'GITHUB_TOKEN',    regex: /\bghp_[A-Za-z0-9]{36}\b/g,                  falsePositive: [] },
  { type: 'GITHUB_TOKEN',    regex: /\bgithub[_-]?token\b\s*[=:]\s*['"]?ghp_[A-Za-z0-9]+\b/gi, falsePositive: [] },
  
  // Stripe keys
  { type: 'STRIPE_KEY',      regex: /\bsk_(?:live|test)_[A-Za-z0-9]{24,}/g,      falsePositive: [] },
  { type: 'STRIPE_KEY',      regex: /\bpk_(?:live|test)_[A-Za-z0-9]{24,}/g,      falsePositive: [] },
  
  // SSH private keys
  { type: 'SSH_KEY',         regex: /-----BEGIN\s+(?:OPENSSH|EC|RSA|DSA|PGP)\s+PRIVATE\s+KEY-----/g, falsePositive: [] },
  
  // Password fields — skip empty/generic assignments
  { type: 'PASSWORD',        regex: /(?:password|passwd|pwd)\s*[=:]\s*['"]?[^\s'"]{8,}/gi, falsePositive: [] },
  
  // Encryption / secret keys
  { type: 'SECRET_KEY',      regex: /(?:encryption[_-]?key|secret[_-]?key|ENCRYPTION_KEY|SECRET_KEY)\s*[=:]\s*['"]?[A-Za-z0-9_\-]{16,}/gi, falsePositive: [] },
  
  // Session tokens
  { type: 'SESSION_TOKEN',   regex: /(?:PHPSESSID|session[_-]?id|session_id)\s*[=:]\s*['"]?[A-Za-z0-9_\-]{16,}/gi, falsePositive: [] },
  
  // .env style key=value pairs (multiline secrets)
  { type: 'ENV_SECRET',      regex: /(?:OPENAI|GITHUB|AWS|DATABASE|STRIPE|SLACK|TELEGRAM)[_A-Z]*\s*[=:]\s*['"]?[A-Za-z0-9_\-]{16,}/g, falsePositive: [] },
];

// ──────────────────────────────────────────────────────────────
// detectSecrets(text) → Secret[]
// Returns array of detected secrets with type, value (redacted), and position
// ──────────────────────────────────────────────────────────────

export function detectSecrets(text) {
  if (!text || typeof text !== 'string') return [];
  
  const results = [];
  
  for (const pattern of SECRET_PATTERNS) {
    // Reset lastIndex for global regexes
    pattern.regex.lastIndex = 0;
    
    let match;
    while ((match = pattern.regex.exec(text)) !== null) {
      const value = match[0];
      
      // Skip obvious false positives
      if (pattern.falsePositive.some(fp => value.includes(fp) && value.length < 30)) {
        continue;
      }
      
      results.push({
        type:     pattern.type,
        value:    redactValue(value),
        position: match.index,
        length:   value.length,
      });
    }
  }
  
  // Deduplicate by position
  const seen = new Set();
  return results.filter(s => {
    const key = `${s.type}:${s.position}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ──────────────────────────────────────────────────────────────
// redactSecrets(text) → string
// Replaces all detected secrets with [REDACTED:TYPE] markers
// ──────────────────────────────────────────────────────────────

export function redactSecrets(text) {
  if (!text || typeof text !== 'string') return text;
  
  let result = text;
  
  for (const pattern of SECRET_PATTERNS) {
    pattern.regex.lastIndex = 0;
    result = result.replace(pattern.regex, `[REDACTED:${pattern.type}]`);
  }
  
  return result;
}

// ──────────────────────────────────────────────────────────────
// hashOriginal(text) → string
// Returns SHA-256 hash of input text for audit logging without storing secrets
// ──────────────────────────────────────────────────────────────

export function hashOriginal(text) {
  if (!text) return null;
  return crypto.createHash('sha256').update(text).digest('hex');
}

// ──────────────────────────────────────────────────────────────
// redactValue(value) → string
// Redacts a single secret value for display in error messages
// ──────────────────────────────────────────────────────────────

function redactValue(value) {
  if (!value) return '[REDACTED]';
  if (value.length <= 8) return '[REDACTED]';
  // Keep first 4 and last 4 chars visible for debugging
  return value.slice(0, 4) + '***' + value.slice(-4);
}

// ──────────────────────────────────────────────────────────────
// scanMemoryFields(fields) → SecretsResult
// Scans multiple fields at once; returns aggregated result
// fields: { content?, title?, tags?, metadata? }
// ──────────────────────────────────────────────────────────────

export function scanMemoryFields(fields) {
  const checks = [];
  
  if (fields.content)    checks.push({ field: 'content',  text: fields.content });
  if (fields.title)      checks.push({ field: 'title',     text: fields.title });
  if (fields.tags) {
    const tagText = Array.isArray(fields.tags) ? fields.tags.join(' ') : String(fields.tags);
    if (tagText) checks.push({ field: 'tags', text: tagText });
  }
  if (fields.metadata) {
    const metaText = typeof fields.metadata === 'object' ? JSON.stringify(fields.metadata) : String(fields.metadata);
    if (metaText && metaText !== '{}') checks.push({ field: 'metadata', text: metaText });
  }
  
  const allSecrets = [];
  for (const check of checks) {
    const secrets = detectSecrets(check.text);
    for (const s of secrets) {
      allSecrets.push({ ...s, field: check.field });
    }
  }
  
  return {
    hasSecrets:    allSecrets.length > 0,
    secrets:       allSecrets,
    isClean:       allSecrets.length === 0,
  };
}

// ──────────────────────────────────────────────────────────────
// SecurityError class for memory store
// ──────────────────────────────────────────────────────────────

export class SecurityError extends Error {
  constructor(secrets) {
    const msg = secrets.map(s => `${s.field}:${s.type} at pos ${s.position}`).join('; ');
    super(`SecurityError: secrets detected (${secrets.length}): ${msg}`);
    this.name = 'SecurityError';
    this.secrets = secrets;
  }
}

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class PermissionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PermissionError';
  }
}

// ──────────────────────────────────────────────────────────────
// DEBUG: Print all patterns (for testing)
// ──────────────────────────────────────────────────────────────

export function listPatterns() {
  return SECRET_PATTERNS.map(p => p.type).filter((v, i, a) => a.indexOf(v) === i);
}