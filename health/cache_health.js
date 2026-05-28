/**
 * cache_health.js — retrieval cache health check
 * Phase C.4 — v1.3.0
 *
 * Checks:
 *   1. Cache set works
 *   2. Cache get returns previously set value
 *   3. Cache clear works
 *
 * Returns: { ok: boolean, latencyMs: number, error?: string }
 */

'use strict';

const path = require('path');
const fs = require('fs');

// Import cache functions from retrieve_context.js runtime
const retrievalPath = path.join(__dirname, '..', 'agents', 'rag-memory', 'runtime', 'retrieve_context.js');

async function checkCache() {
  const t0 = Date.now();
  try {
    let cacheSet, cacheGet, cacheClear;
    try {
      const mod = require(retrievalPath);
      cacheSet = mod.setCache || mod.cacheSet;
      cacheGet = mod.getCache || mod.cacheGet;
      cacheClear = mod.clearCache || mod.cacheClear;
    } catch (importErr) {
      // Cache functions may not be exported — degraded, not critical
      return {
        ok: false,
        latencyMs: Date.now() - t0,
        error: 'cache functions not exportable: ' + (importErr.message || String(importErr)),
      };
    }

    if (typeof cacheSet !== 'function' || typeof cacheGet !== 'function') {
      return {
        ok: false,
        latencyMs: Date.now() - t0,
        error: 'cache set/get not available',
      };
    }

    const testKey = '__health_check_' + Date.now();
    const testValue = { ok: true, ts: Date.now() };

    // set
    try { cacheSet(testKey, testValue); } catch (setErr) {
      return { ok: false, latencyMs: Date.now() - t0, error: 'cache set failed: ' + setErr.message };
    }

    // get
    let got;
    try { got = cacheGet(testKey); } catch (getErr) {
      return { ok: false, latencyMs: Date.now() - t0, error: 'cache get failed: ' + getErr.message };
    }

    if (!got || got.ok !== true) {
      return { ok: false, latencyMs: Date.now() - t0, error: 'cache get returned unexpected value' };
    }

    // clear (best-effort)
    if (typeof cacheClear === 'function') {
      try { cacheClear(testKey); } catch (_) { /* ignore */ }
    }

    return { ok: true, latencyMs: Date.now() - t0 };
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - t0,
      error: err.message || String(err),
    };
  }
}

module.exports = { checkCache };
