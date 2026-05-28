#!/usr/bin/env node

/**
 * RAG Memory Agent — retrieve.js
 * v1.1.1
 *
 * Semantic search over the ingested corpus.
 *
 * Usage: node agents/rag-memory/retrieve.js "black screen WebGL"
 */

const fs = require('fs');
const path = require('path');

const VECTOR_STORE = path.join(__dirname, 'vector-store', 'corpus.json');

function tokenize(text) {
  const STOP_WORDS = new Set([
    'the', 'and', 'for', 'that', 'this', 'with', 'from', 'have',
    'are', 'was', 'not', 'but', 'you', 'all', 'can', 'has', 'had',
    'been', 'will', 'would', 'could', 'should', 'may',
  ]);
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2)
    .filter(w => !STOP_WORDS.has(w));
}

/**
 * Score a chunk against query terms using TF and source weight.
 */
function score(queryTerms, chunk) {
  let score = 0;
  const text = chunk.text.toLowerCase();

  for (const term of queryTerms) {
    // Exact match boost
    if (text.includes(term)) {
      score += 5;
    }
    // TF score
    if (chunk.tf && chunk.tf[term]) {
      score += chunk.tf[term] * 2;
    }
    // Section heading match boost
    if (chunk.section.toLowerCase().includes(term)) {
      score += 10;
    }
  }

  // Apply source weight
  return score * (chunk.weight / 10);
}

function categorize(query, results) {
  const categories = {
    'material-failure': ['black screen', 'shader', 'pink', 'hdpr', 'material'],
    'wasm-failure': ['wasm', 'loader', 'timeout', 'cannot load'],
    'websocket-failure': ['websocket', 'disconnect', 'desync', 'ws fail'],
    'governance': ['iron law', 'blocking', 'invariant', 'protocol'],
    'runtime-e2e': ['5-channel', 'partygamebridge', 'state_update', 'broadcast'],
    'build-failure': ['build', 'batchmode', '26/26', 'check'],
  };

  const queryLower = query.toLowerCase();
  for (const [category, terms] of Object.entries(categories)) {
    if (terms.some(t => queryLower.includes(t))) {
      return category;
    }
  }
  return 'general';
}

function getAction(category) {
  const actions = {
    'material-failure': 'Review UNITY_WEBGL_MATERIAL_POLICY.md §1-2 before modifying any materials',
    'wasm-failure': 'Verify build output path and file size. Check loaderUrl in index.html',
    'websocket-failure': 'Check server connection, protocol auto-detect, WS relay',
    'governance': 'Verify against Five Iron Laws and PATH_SCOPED_RULES.md',
    'runtime-e2e': 'Run /runtime-gate before and after any changes',
    'build-failure': 'Run check-unity-webgl-build.js to identify specific failures',
    'general': 'Review relevant reports and policies before proceeding',
  };
  return actions[category] || actions.general;
}

function main() {
  const query = process.argv[2];
  if (!query) {
    console.error('Usage: node retrieve.js "<query>"');
    process.exit(1);
  }

  if (!fs.existsSync(VECTOR_STORE)) {
    console.error('Vector store not found. Run ingest.js first.');
    process.exit(1);
  }

  const store = JSON.parse(fs.readFileSync(VECTOR_STORE, 'utf-8'));
  const queryTerms = tokenize(query);
  const category = categorize(query, null);

  // Score all chunks
  const scored = store.corpus
    .map(chunk => ({
      ...chunk,
      score: score(queryTerms, chunk),
    }))
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5); // Top 5

  const output = {
    query,
    category,
    action: getAction(category),
    results: scored.map(c => ({
      source: c.source,
      section: c.section,
      relevance: Math.min(c.score / 100, 1).toFixed(2),
      excerpt: c.text.substring(0, 300).replace(/\n/g, ' '),
    })),
  };

  console.log(JSON.stringify(output, null, 2));
}

main();
