// ========================================
// v1.2.0 Phase B.3 — Path Normalizer
// Ensures consistent path comparison between
// expected_files (test_queries.json) and retrieved paths
// ========================================

import path from 'path';

const PROJECT_ROOT = (() => {
  // Detect project root from this file's location
  const __dirname = new URL('.', import.meta.url).pathname;
  return path.resolve(__dirname, '..', '..');
})();

/**
 * Normalize a file path to repo-relative format.
 * - Strips absolute prefix (PROJECT_ROOT)
 * - Strips leading ./ prefix
 * - Normalizes slashes to /
 * - Lowercases for case-insensitive matching
 *
 * @param {string} rawPath - raw path from any source
 * @returns {{ clean: string, normalized: string }}
 */
export function normalizePath(rawPath) {
  if (!rawPath) return { clean: '', normalized: '' };

  let p = rawPath.trim();

  // Remove absolute prefix
  if (p.startsWith(PROJECT_ROOT)) {
    p = p.slice(PROJECT_ROOT.length);
  }

  // Remove leading ./ or /
  p = p.replace(/^\.?[\\/]+/, '');

  // Normalize slashes
  p = p.split(path.sep).join('/');

  // Remove trailing slash
  p = p.replace(/\/+$/, '');

  return {
    clean: p,
    normalized: p.toLowerCase(),
  };
}

/**
 * Check if two paths refer to the same file (case-insensitive)
 */
export function pathsMatch(pathA, pathB) {
  const a = normalizePath(pathA);
  const b = normalizePath(pathB);
  return a.normalized === b.normalized;
}

/**
 * Find best match for an expected path among retrieved paths
 * Handles: partial matches, filename-only matches, alias patterns
 *
 * @param {string} expectedPath - from test_queries.json expected_files
 * @param {string[]} retrievedPaths - from retrieval results
 * @returns {{ matched: boolean, matchedPath: string|null, score: number }}
 */
export function findBestPathMatch(expectedPath, retrievedPaths) {
  const normExpected = normalizePath(expectedPath);

  // 1. Exact normalized match
  for (const rp of retrievedPaths) {
    if (pathsMatch(expectedPath, rp)) {
      return { matched: true, matchedPath: rp, score: 1.0 };
    }
  }

  // 2. Filename match (different directory prefix)
  const expectedFilename = normExpected.clean.split('/').pop();
  for (const rp of retrievedPaths) {
    const normRp = normalizePath(rp);
    const rpFilename = normRp.clean.split('/').pop();
    if (rpFilename === expectedFilename) {
      return { matched: true, matchedPath: rp, score: 0.8 };
    }
  }

  // 3. Partial path match (expected contains or is contained in retrieved)
  for (const rp of retrievedPaths) {
    const normRp = normalizePath(rp);
    if (normExpected.normalized.includes(normRp.normalized) ||
        normRp.normalized.includes(normExpected.normalized)) {
      return { matched: true, matchedPath: rp, score: 0.5 };
    }
  }

  return { matched: false, matchedPath: null, score: 0 };
}

/**
 * Apply alias mapping for known path variants.
 * Some files exist at multiple locations or have been renamed.
 */
export function applyPathAliases(normalizedExpected) {
  const aliases = {
    'partygamesdk-mvp/baseline.md': 'baseline.md',
    'docs/baseline.md': 'baseline.md',
  };

  const lower = normalizedExpected.toLowerCase();
  return aliases[lower] || lower;
}

// Export PROJECT_ROOT for tests
export { PROJECT_ROOT };
