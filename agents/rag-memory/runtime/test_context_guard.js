// ========================================
// v1.2.0 Phase C — Context Guard Tests
// ========================================

import { guardContext, guardChunk, containsSecrets, redactSecrets, FORBIDDEN_PATHS } from './context_guard.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ ${message}`);
    passed++;
  } else {
    console.log(`  ❌ ${message}`);
    failed++;
  }
}

function runTests() {
  console.log('='.repeat(80));
  console.log('[Test] Context Guard Tests');
  console.log('='.repeat(80));
  console.log('');

  // T1: No secrets in normal content
  console.log('[T1] Normal content passes through');
  const normal = {
    chunks: [{
      path: 'docs/normal.md',
      content: 'This is normal content about PartyGameSDK.',
      snippet: 'Normal content',
    }],
    context: 'This is normal content about PartyGameSDK.',
    violations: 0,
  };
  const guarded1 = guardContext(normal);
  assert(guarded1.violations === 0, 'Normal content has no violations');
  assert(guarded1.context.includes('normal content'), 'Content preserved');
  console.log('');

  // T2: API key redaction
  console.log('[T2] API key redaction');
  const withApiKey = {
    chunks: [{
      path: 'docs/config.md',
      content: 'API key: sk-1234567890abcdefghijklmnop',
      snippet: 'API key: sk-1234567890',
    }],
    context: 'API key: sk-1234567890abcdefghijklmnop',
    violations: 0,
  };
  const guarded2 = guardContext(withApiKey);
  assert(guarded2.violations > 0, 'API key detected');
  assert(!guarded2.context.includes('sk-12345'), 'API key redacted');
  assert(guarded2.context.includes('[REDACTED_'), 'Redaction marker present');
  console.log('');

  // T3: OPENAI_API_KEY redaction
  console.log('[T3] OPENAI_API_KEY redaction');
  const withOpenAI = {
    chunks: [{
      path: '.env',
      content: 'OPENAI_API_KEY=sk-1234567890abcdefghijklmnop',
      snippet: 'OPENAI_API_KEY=sk-1234567890',
    }],
    context: 'OPENAI_API_KEY=sk-1234567890abcdefghijklmnop',
    violations: 0,
  };
  const guarded3 = guardContext(withOpenAI);
  assert(guarded3.violations > 0, 'OPENAI_API_KEY detected');
  assert(!guarded3.context.includes('sk-12345'), 'Secret redacted');
  console.log('');

  // T4: Forbidden path redaction
  console.log('[T4] Forbidden path redaction');
  const forbiddenPath = {
    chunks: [{
      path: '.env',
      content: 'SECRET=mysecretpassword',
      snippet: 'SECRET=mysecretpassword',
    }],
    context: 'SECRET=mysecretpassword',
    violations: 0,
  };
  const guarded4 = guardContext(forbiddenPath);
  assert(guarded4.chunks[0].path === '[REDACTED_FORBIDDEN_PATH]', 'Forbidden path redacted');
  assert(guarded4.chunks[0].content.includes('not allowed'), 'Content replaced');
  console.log('');

  // T5: Multiple secrets
  console.log('[T5] Multiple secrets in one chunk');
  const multiSecret = {
    chunks: [{
      path: 'docs/secrets.md',
      content: 'API: sk-test12345678901234567890\nToken: Bearer abcdefghij1234567890',
      snippet: 'API and Token secrets',
    }],
    context: 'API: sk-test12345678901234567890\nToken: Bearer abcdefghij1234567890',
    violations: 0,
  };
  const guarded5 = guardContext(multiSecret);
  assert(guarded5.violations >= 2, 'Multiple violations detected');
  console.log('');

  // T6: containsSecrets function
  console.log('[T6] containsSecrets function');
  assert(!containsSecrets('Normal content'), 'Normal content returns false');
  assert(containsSecrets('API key: sk-1234567890abcdefghijklmn'), 'API key returns true');
  assert(containsSecrets('OPENAI_API_KEY=abcdefghijklmnopqrstuvw'), 'OPENAI_API_KEY returns true');
  console.log('');

  // T7: redactSecrets function
  console.log('[T7] redactSecrets function');
  const redacted = redactSecrets('My API key is sk-1234567890abcdefghijklmn');
  assert(!redacted.includes('sk-1234567890'), 'API key redacted');
  assert(redacted.includes('[REDACTED_'), 'Redaction marker present');
  console.log('');

  // T8: guardChunk function
  console.log('[T8] guardChunk function');
  const normalChunk = {
    path: 'docs/normal.md',
    content: 'Normal content here',
    snippet: 'Normal content',
  };
  const result1 = guardChunk(normalChunk);
  assert(!result1.redacted, 'Normal chunk not redacted');
  assert(result1.chunk.content === normalChunk.content, 'Content preserved');
  console.log('');

  // T9: Warning logging
  console.log('[T9] Warnings generated');
  const withWarning = {
    chunks: [{
      path: 'docs/secrets.md',
      content: 'Password: supersecret123',
      snippet: 'Password exposed',
    }],
    context: 'Password: supersecret123',
    violations: 0,
  };
  const guarded9 = guardContext(withWarning);
  assert(guarded9.warnings.length > 0, 'Warnings generated');
  console.log('');

  // Results
  console.log('='.repeat(80));
  console.log(`[Test] Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(80));

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
