#!/usr/bin/env node
/**
 * check-no-secrets.js — Secret detection script
 * Scans tracked files for secrets (API keys, passwords, etc.)
 *
 * Rules:
 * 1. ALLOW: OPENAI_API_KEY= (empty value)
 * 2. ALLOW: OPENAI_API_KEY=<placeholder> (placeholder like "set-in-shell-only")
 * 3. PROHIBIT: OPENAI_API_KEY=sk-... (real key pattern)
 * 4. PROHIBIT: sk- in any tracked file (secret pattern)
 * 5. PROHIBIT: .env, .env.local, .env.*.local tracked by Git
 * 6. PROHIBIT: RAG_DATABASE_URL with password (postgres://user:password@...)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

// Patterns to detect secrets
const SECRET_PATTERNS = [
  // OpenAI API key (sk-...)
  /\bsk-[A-Za-z0-9]{20,}\b/,
  
  // Anthropic API key (sk-ant-...)
  /\bsk-ant-[A-Za-z0-9]{20,}\b/,
  
  // Generic API key (API_KEY = "..." with high entropy)
  /API_KEY\s*=\s*["']?[A-Za-z0-9_\-]{30,}/,
  
  // Password in RAG_DATABASE_URL
  /RAG_DATABASE_URL\s*=\s*postgres:\/\/[^\/]*:[^\/]+@[^\/]+\/[^\/]+/,
];

// Files that should NOT be tracked
const FORBIDDEN_TRACKED_FILES = [
  '.env',
  '.env.local',
  '.env.*.local',
];

// Allowed patterns (exceptions)
const ALLOWED_PATTERNS = [
  // Empty value
  /OPENAI_API_KEY\s*=\s*$/,
  
  // Placeholder value (no sk-...)
  /OPENAI_API_KEY\s*=\s*["']?<(set|placeholder|your).*["']?$/i,
  
  // .env.example (allowed, but must not contain sk-...)
  /\.env\.example$/,
];

function log(message) {
  console.log(`[check-no-secrets] ${message}`);
}

function error(message) {
  console.error(`[check-no-secrets] ❌ ERROR: ${message}`);
}

function warn(message) {
  console.warn(`[check-no-secrets] ⚠️  WARN: ${message}`);
}

function success(message) {
  console.log(`[check-no-secrets] ✅ SUCCESS: ${message}`);
}

// Get all tracked files (committed in Git)
function getTrackedFiles() {
  try {
    const output = execSync('git ls-files', { cwd: ROOT, encoding: 'utf-8' });
    return output.trim().split('\n').filter(f => f.length > 0);
  } catch (err) {
    error(`Failed to get tracked files: ${err.message}`);
    process.exit(1);
  }
}

// Check if file is allowed to be tracked
function isAllowedTrackedFile(filePath) {
  const fileName = path.basename(filePath);
  
  // Check against forbidden patterns
  for (const pattern of FORBIDDEN_TRACKED_FILES) {
    const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
    if (regex.test(fileName)) {
      return false;
    }
  }
  
  return true;
}

// Check if content matches allowed patterns (exceptions)
function isAllowedContent(filePath, line) {
  for (const pattern of ALLOWED_PATTERNS) {
    if (pattern.test(filePath) && line.match(/OPENAI_API_KEY\s*=\s*$/)) {
      return true; // Empty value allowed
    }
    
    if (pattern.test(filePath) && line.match(/OPENAI_API_KEY\s*=\s*["']?<(set|placeholder|your).*["']?$/i)) {
      return true; // Placeholder allowed
    }
  }
  
  return false;
}

// Scan file for secrets
function scanFile(filePath) {
  const fullPath = path.join(ROOT, filePath);
  
  // Skip binary files
  if (!fs.existsSync(fullPath)) {
    return [];
  }
  
  const content = fs.readFileSync(fullPath, 'utf-8');
  const lines = content.split('\n');
  const secrets = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip allowed content
    if (isAllowedContent(filePath, line)) {
      continue;
    }
    
    // Check against secret patterns
    for (const pattern of SECRET_PATTERNS) {
      const match = line.match(pattern);
      if (match) {
        secrets.push({
          file: filePath,
          line: i + 1,
          content: line.trim(),
          pattern: pattern.source,
        });
      }
    }
  }
  
  return secrets;
}

// Main function
function main() {
  log('Starting secret detection...');
  
  let hasError = false;
  
  // 1. Check tracked files (should not include .env, .env.local, etc.)
  log('Checking tracked files...');
  const trackedFiles = getTrackedFiles();
  
  for (const filePath of trackedFiles) {
    const fileName = path.basename(filePath);
    
    if (!isAllowedTrackedFile(filePath)) {
      error(`Forbidden file tracked: ${filePath}`);
      hasError = true;
    }
  }
  
  if (!hasError) {
    success('No forbidden files tracked');
  }
  
  // 2. Scan all tracked files for secret patterns
  log('Scanning tracked files for secrets...');
  let totalSecrets = 0;
  
  for (const filePath of trackedFiles) {
    const secrets = scanFile(filePath);
    
    if (secrets.length > 0) {
      for (const secret of secrets) {
        error(`Secret found in ${secret.file}:${secret.line}`);
        error(`  Content: ${secret.content}`);
        error(`  Pattern: ${secret.pattern}`);
        totalSecrets++;
      }
      
      hasError = true;
    }
  }
  
  if (totalSecrets === 0) {
    success('No secrets found in tracked files');
  }
  
  // 3. Special check: .env.example should NOT contain sk-...
  log('Checking .env.example (if exists)...');
  const envExamplePath = path.join(ROOT, '.env.example');
  
  if (fs.existsSync(envExamplePath)) {
    const content = fs.readFileSync(envExamplePath, 'utf-8');
    
    if (content.includes('sk-')) {
      error('.env.example contains "sk-" (should use empty value or placeholder)');
      hasError = true;
    } else {
      success('.env.example does not contain "sk-"');
    }
  } else {
    warn('.env.example not found (skip)');
  }
  
  // 4. Special check: RAG_DATABASE_URL should not contain password in tracked files
  log('Checking RAG_DATABASE_URL (if tracked)...');
  
  for (const filePath of trackedFiles) {
    if (filePath.endsWith('.env.example') || filePath.endsWith('.env')) {
      const fullPath = path.join(ROOT, filePath);
      const content = fs.readFileSync(fullPath, 'utf-8');
      
      const match = content.match(/RAG_DATABASE_URL\s*=\s*postgres:\/\/[^\/]*:[^\/]+@[^\/]+\/[^\/]+/);
      if (match) {
        error(`RAG_DATABASE_URL contains password in ${filePath}`);
        error(`  Value: ${match[0]}`);
        hasError = true;
      }
    }
  }
  
  // Final result
  if (hasError) {
    error('Secret detection FAILED');
    process.exit(1);
  } else {
    success('No secrets found');
    process.exit(0);
  }
}

main();
