#!/usr/bin/env node

/**
 * Runtime Triage Agent — classify-runtime-failure.js
 * v1.1.1
 *
 * Classifies a runtime failure based on evidence and the FAILURE_MATRIX.
 *
 * Usage:
 *   node classify-runtime-failure.js --evidence '{"console": "Shader not supported", "visual": "black"}'
 *   node classify-runtime-failure.js --type black-screen
 *   node classify-runtime-failure.js --test-output artifacts/test-results.json
 */

const fs = require('fs');
const path = require('path');

const MATRIX = {
  'RTE-001': {
    category: 'Loader fail',
    severity: 'CRITICAL',
    symptoms: ['404', 'loader.js not found', 'blank page', 'no canvas'],
    probableCause: 'loader.js path mismatch in index.html',
    recovery: [
      'Verify loaderUrl in index.html matches actual file path',
      'Run: curl -I <loader-url> to confirm HTTP status',
      'Check nginx/CDN serving the correct directory',
    ],
    rollback: 'Restore index.html loaderUrl to known-good value',
    docs: ['docs/RUNTIME_FAILURE_MATRIX.md §1'],
  },
  'RTE-002': {
    category: 'Wasm fail',
    severity: 'CRITICAL',
    symptoms: ['loading bar stuck', 'wasm timeout', 'failed to prepare wasm', 'tab freeze'],
    probableCause: '.wasm file 404, corrupted, or too large',
    recovery: [
      'Verify .wasm file exists at correct path',
      'Check file size (mobile limit ~50MB)',
      'Enable Brotli compression in nginx',
      'Strip unused engine features in Player Settings',
    ],
    rollback: 'Revert to last known-good build output',
    docs: ['docs/RUNTIME_FAILURE_MATRIX.md §2'],
  },
  'RTE-003': {
    category: 'Missing shader',
    severity: 'HIGH',
    symptoms: ['pink', 'magenta', 'shader error', 'fallback shader'],
    probableCause: 'Shader not in WebGL build or HDRP material used',
    recovery: [
      'Replace material with URP Simple Lit, Unlit/Texture, or Unlit/Color',
      'Add shader to Always Included Shaders in Graphics Settings',
      'Verify UNITY_WEBGL_MATERIAL_POLICY.md compliance',
    ],
    rollback: 'Replace all scene materials with WebGLSafeFallback materials',
    docs: ['docs/RUNTIME_FAILURE_MATRIX.md §3', 'UnityExamples/UNITY_WEBGL_MATERIAL_POLICY.md'],
  },
  'RTE-004': {
    category: 'Black screen',
    severity: 'CRITICAL',
    symptoms: ['canvas renders', 'all black', 'no game objects', 'pixel brightness < 10'],
    probableCause: 'HDRP material, missing camera, or empty scene',
    recovery: [
      '1. Verify scene has active Camera with correct culling mask',
      '2. Replace all materials with WebGL-safe shaders',
      '3. Check UNITY_WEBGL_MATERIAL_POLICY.md §1 for allowed shaders',
      '4. Verify at least one GameObject renders (e.g., WebGLGroundPlane)',
    ],
    rollback: 'Revert to _RuntimeVerifiedTemplate scene + materials',
    docs: ['docs/RUNTIME_FAILURE_MATRIX.md §4', 'UnityExamples/UNITY_WEBGL_MATERIAL_POLICY.md §1-2'],
  },
  'RTE-005': {
    category: 'WebSocket fail',
    severity: 'HIGH',
    symptoms: ['disconnected', 'connection failed', 'WS error', 'no server response'],
    probableCause: 'Server not running, wrong URL, SSL mismatch, firewall',
    recovery: [
      '1. Verify docker compose up -d (all containers healthy)',
      '2. Check protocol auto-detect: ws:// vs wss://',
      '3. Verify nginx proxy passes WebSocket correctly',
      '4. Test: curl http://localhost/__health',
    ],
    rollback: 'Restart server with known-good config',
    docs: ['docs/RUNTIME_FAILURE_MATRIX.md §5'],
  },
  'RTE-006': {
    category: 'Controller desync',
    severity: 'HIGH',
    symptoms: ['input sent', 'state not updated', 'UI unchanged', 'broadcast missing'],
    probableCause: 'state_update handler missing or playerIndex mismatch',
    recovery: [
      '1. Verify controller handles state_update message type',
      '2. Check screen forwardToUnity() is called',
      '3. Verify server injects correct playerIndex',
      '4. Check broadcast relay in server logs',
    ],
    rollback: 'Restore controller index.html to verified version',
    docs: ['docs/RUNTIME_FAILURE_MATRIX.md §6'],
  },
  'RTE-007': {
    category: 'Runtime timeout',
    severity: 'HIGH',
    symptoms: ['assertRuntimeReady timeout', 'test timeout 120s', 'loading bar stuck'],
    probableCause: 'Build too large or JavaScript error in loader',
    recovery: [
      '1. Check build output size (wasm + data should be < 200MB)',
      '2. Check browser console for JS errors',
      '3. Enable Brotli compression for faster load',
      '4. Strip unused engine features',
    ],
    rollback: 'Use smaller build or increase timeout',
    docs: ['docs/RUNTIME_FAILURE_MATRIX.md §7'],
  },
  'RTE-008': {
    category: 'State broadcast fail',
    severity: 'HIGH',
    symptoms: ['__PARTYGAME_LAST_STATE__ never updated', 'no state_update', 'hook empty'],
    probableCause: 'PartyGameBridge state callback not wired or broadcast not sent',
    recovery: [
      '1. Verify PartyGameBridge.jslib calls OnStateUpdate callback',
      '2. Check server relay logic for state_update messages',
      '3. Verify controller WebSocket connection alive',
      '4. Check Unity Debug.Log for state broadcast attempts',
    ],
    rollback: 'Restore PartyGameBridge.jslib to verified version',
    docs: ['docs/RUNTIME_FAILURE_MATRIX.md §8'],
  },
};

function classify(evidence) {
  let matched = null;

  for (const [code, entry] of Object.entries(MATRIX)) {
    const evidenceText = typeof evidence === 'string'
      ? evidence.toLowerCase()
      : JSON.stringify(evidence).toLowerCase();

    for (const symptom of entry.symptoms) {
      if (evidenceText.includes(symptom.toLowerCase())) {
        matched = { code, ...entry };
        break;
      }
    }
    if (matched) break;
  }

  if (!matched) {
    return {
      error_code: 'RTE-UNKNOWN',
      category: 'Unclassified failure',
      severity: 'HIGH',
      probable_cause: 'Failure does not match any known category',
      evidence: JSON.stringify(evidence),
      recovery_plan: [
        '1. Manually review failure evidence',
        '2. Compare against docs/RUNTIME_FAILURE_MATRIX.md',
        '3. If new category: update FAILURE_MATRIX and classify-runtime-failure.js',
      ],
      suggested_rollback: 'Revert to _RuntimeVerifiedTemplate baseline',
      related_docs: ['docs/RUNTIME_FAILURE_MATRIX.md'],
    };
  }

  return {
    error_code: matched.code,
    category: matched.category,
    severity: matched.severity,
    probable_cause: matched.probableCause,
    evidence: typeof evidence === 'string' ? evidence : JSON.stringify(evidence),
    recovery_plan: matched.recovery,
    suggested_rollback: matched.rollback,
    related_docs: matched.docs,
  };
}

function main() {
  const args = process.argv.slice(2);
  let evidence = '';

  if (args.includes('--type')) {
    const typeIdx = args.indexOf('--type');
    evidence = args[typeIdx + 1] || '';
  } else if (args.includes('--evidence')) {
    const evIdx = args.indexOf('--evidence');
    evidence = args[evIdx + 1] || '';
  } else if (args.includes('--test-output')) {
    const toIdx = args.indexOf('--test-output');
    const filepath = args[toIdx + 1];
    if (filepath && fs.existsSync(filepath)) {
      evidence = fs.readFileSync(filepath, 'utf-8');
    }
  } else {
    evidence = args.join(' ');
  }

  if (!evidence) {
    console.error('Usage: node classify-runtime-failure.js --type <failure-type>');
    console.error('       node classify-runtime-failure.js --evidence \'{"console":"..."}\'');
    console.error('       node classify-runtime-failure.js --test-output <json-file>');
    console.error('\nKnown types: black-screen, loader-fail, wasm-fail, missing-shader,');
    console.error('             websocket-fail, controller-desync, runtime-timeout, broadcast-fail');
    process.exit(1);
  }

  const result = classify(evidence);
  console.log(JSON.stringify(result, null, 2));
}

main();
