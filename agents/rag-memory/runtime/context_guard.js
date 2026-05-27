// ========================================
// v1.2.0 Phase C — Context Guard
// Governance-safe filtering: strip secrets from prompt context
// ========================================

/**
 * Secret patterns to detect and redact
 * Note: patterns use 'i' flag (case-insensitive) but NOT 'g' flag
 * because we use match() for detection and replace() for replacement
 */
const SECRET_PATTERNS = [
  // Environment variables
  { pattern: /OPENAI_API_KEY\s*[=:]\s*['"]?([a-zA-Z0-9_-]{20,})['"]?/i, name: 'OPENAI_API_KEY' },
  { pattern: /ANTHROPIC_API_KEY\s*[=:]\s*['"]?([a-zA-Z0-9_-]{20,})['"]?/i, name: 'ANTHROPIC_API_KEY' },
  { pattern: /GITHUB_TOKEN\s*[=:]\s*['"]?([a-zA-Z0-9_-]{20,})['"]?/i, name: 'GITHUB_TOKEN' },
  { pattern: /DATABASE_URL\s*[=:]\s*['"]?([^\s'"]{20,})['"]?/i, name: 'DATABASE_URL' },
  { pattern: /REDIS_URL\s*[=:]\s*['"]?([^\s'"]{20,})['"]?/i, name: 'REDIS_URL' },
  { pattern: /POSTGRES_URL\s*[=:]\s*['"]?([^\s'"]{20,})['"]?/i, name: 'POSTGRES_URL' },
  
  // Generic secrets
  { pattern: /sk-[a-zA-Z0-9]{20,}/i, name: 'API_KEY_(sk-)' },
  { pattern: /password\s*[=:]\s*['"]?([^\s'"]{8,})['"]?/i, name: 'password' },
  { pattern: /secret\s*[=:]\s*['"]?([^\s'"]{8,})['"]?/i, name: 'secret' },
  { pattern: /token\s*[=:]\s*['"]?([a-zA-Z0-9_-]{20,})['"]?/i, name: 'token' },
  { pattern: /bearer\s+[a-zA-Z0-9_-]{20,}/i, name: 'bearer_token' },
  
  // Private keys
  { pattern: /-----BEGIN\s+(?:RSA|OPENSSH|EC|DSA)\s+PRIVATE\s+KEY-----/i, name: 'PRIVATE_KEY' },
  
  // AWS credentials
  { pattern: /AKIA[0-9A-Z]{16}/i, name: 'AWS_ACCESS_KEY' },
  { pattern: /[a-zA-Z0-9/+=]{40}(?=\s|$)/i, name: 'AWS_SECRET_KEY' },
];

/**
 * Paths that should never be included in context
 */
const FORBIDDEN_PATHS = [
  '.env',
  '.env.local',
  '.env.production',
  '.env.development',
  'secrets.json',
  'credentials.json',
  'id_rsa',
  'id_ed25519',
  '.npmrc',
  'netrc',
];

/**
 * Patterns for sensitive content within files
 */
const SENSITIVE_PATTERNS = [
  /localhost:5432/i,
  /password\s*=\s*['"][^'"]+['"]/i,
  /api[_-]?key\s*=\s*['"][^'"]+['"]/i,
];

/**
 * Guard prompt context against secret leakage
 */
function guardContext(response) {
  let violations = response.violations || 0;
  const warnings = [];

  // Check chunks for forbidden paths
  const guardedChunks = response.chunks.map((chunk, index) => {
    const result = guardChunk(chunk);
    if (result.redacted) {
      violations++;
      warnings.push(`Chunk ${index + 1}: Redacted ${result.redactedCount} secrets`);
    }
    return result.chunk;
  });

  // Guard the context string
  let guardedContext = response.context || '';
  for (const secretDef of SECRET_PATTERNS) {
    const matches = guardedContext.match(new RegExp(secretDef.pattern, 'gi'));
    if (matches) {
      violations += matches.length;
      warnings.push(`Context: Redacted ${matches.length} ${secretDef.name}(s)`);
      guardedContext = guardedContext.replace(new RegExp(secretDef.pattern, 'gi'), `[REDACTED_${secretDef.name}]`);
    }
  }

  // Log warnings
  if (warnings.length > 0) {
    console.warn('[ContextGuard] ⚠️ Security warnings:');
    for (const w of warnings) {
      console.warn(`  - ${w}`);
    }
  }

  return {
    context: guardedContext,
    violations,
    warnings,
    chunks: guardedChunks,
  };
}

/**
 * Guard a single chunk
 */
function guardChunk(chunk) {
  let redacted = false;
  let redactedCount = 0;

  // Check if path is forbidden
  const pathLower = (chunk.path || '').toLowerCase();
  for (const forbidden of FORBIDDEN_PATHS) {
    if (pathLower.includes(forbidden.toLowerCase())) {
      chunk = {
        ...chunk,
        path: '[REDACTED_FORBIDDEN_PATH]',
        content: '[REDACTED: This file type is not allowed in prompt context]',
        snippet: '[REDACTED]',
      };
      redacted = true;
      redactedCount++;
      return { chunk, redacted, redactedCount };
    }
  }

  // Redact secrets in content
  let content = chunk.content || '';
  let snippet = chunk.snippet || '';

  for (const secretDef of SECRET_PATTERNS) {
    const regex = new RegExp(secretDef.pattern, 'gi');
    const contentMatches = content.match(regex);
    const snippetMatches = snippet.match(regex);
    
    if (contentMatches) {
      redactedCount += contentMatches.length;
      redacted = true;
      content = content.replace(regex, `[REDACTED_${secretDef.name}]`);
    }
    
    if (snippetMatches) {
      snippet = snippet.replace(regex, `[REDACTED_${secretDef.name}]`);
    }
  }

  // Redact sensitive patterns
  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(content)) {
      redactedCount++;
      redacted = true;
      content = content.replace(pattern, '[REDACTED_CONNECTION_STRING]');
    }
  }

  return {
    chunk: { ...chunk, content, snippet },
    redacted,
    redactedCount,
  };
}

/**
 * Check if content contains secrets
 */
function containsSecrets(content) {
  if (!content) return false;
  
  for (const secretDef of SECRET_PATTERNS) {
    if (secretDef.pattern.test(content)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Redact secrets from any string
 */
function redactSecrets(text) {
  let result = text;
  
  for (const secretDef of SECRET_PATTERNS) {
    const regex = new RegExp(secretDef.pattern, 'gi');
    result = result.replace(regex, `[REDACTED_${secretDef.name}]`);
  }
  
  return result;
}

export { guardContext, guardChunk, containsSecrets, redactSecrets, SECRET_PATTERNS, FORBIDDEN_PATHS };
