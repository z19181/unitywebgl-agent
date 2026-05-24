#!/usr/bin/env node

/**
 * RAG Memory Agent — ingest.js
 * v1.1.1
 *
 * Ingests PartyGameSDK markdown files into a lightweight
 * vector store for semantic retrieval.
 *
 * Usage: node agents/rag-memory/ingest.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../');
const VECTOR_STORE = path.join(__dirname, 'vector-store', 'corpus.json');

/**
 * Sources to ingest, with priority weights.
 */
const SOURCES = [
  { glob: 'docs/RUNTIME_FAILURE_MATRIX.md', weight: 10 },
  { glob: 'docs/RUNTIME_FAILURE_MATRIX.md', weight: 10 },
  { glob: 'UnityExamples/UNITY_WEBGL_MATERIAL_POLICY.md', weight: 10 },
  { glob: 'UnityExamples/WEBGL_RUNTIME_PIPELINE.md', weight: 10 },
  { glob: 'docs/PATH_SCOPED_RULES.md', weight: 9 },
  { glob: 'docs/GOVERNANCE_LAYER_REPORT.md', weight: 8 },
  { glob: 'UnityExamples/GAME_TEMPLATE_FACTORY.md', weight: 8 },
  { glob: 'PARTY_GAME_SDK_FINAL_HANDOFF.md', weight: 8 },
  { glob: 'docs/WORKFLOW_COMMANDS.md', weight: 7 },
  { glob: 'UnityExamples/RUNTIME_VERIFIED_TEMPLATE_REPORT.md', weight: 7 },
  { glob: 'SCREEN_WEBGL_RUNTIME_FIX_REPORT.md', weight: 9 },
  { glob: 'CODEX_RESULT.md', weight: 6 },
  { glob: 'docs/WEBGL_RUNTIME_AUTOMATION_PLAN.md', weight: 6 },
  { glob: 'docs/RUNTIME_ARTIFACT_POLICY.md', weight: 5 },
  { glob: 'docs/AGENT_STUDIO_HIERARCHY.md', weight: 5 },
  { glob: 'docs/RUNTIME_AUTOMATION_PHASE_REPORT.md', weight: 6 },
  { glob: 'UnityExamples/AGENT_GAME_GENERATION_PROMPT.md', weight: 7 },
  { glob: 'docs/templates/*.md', weight: 4 },
];

/**
 * Simple chunker: split markdown by ## headings.
 */
function chunkMarkdown(text, filepath, weight) {
  const chunks = [];
  const sections = text.split(/(?=^## )/m);

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    // Extract heading for metadata
    const headingMatch = trimmed.match(/^## (.+)/m);
    const heading = headingMatch ? headingMatch[1].trim() : '(top)';

    chunks.push({
      source: filepath,
      section: heading,
      text: trimmed.substring(0, 4000), // Limit chunk size
      weight,
      tokens: Math.ceil(trimmed.length / 4), // Rough token estimate
    });
  }

  return chunks;
}

/**
 * Simple TF-IDF vectorization (term frequency only, for in-memory matching).
 */
function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2)
    .filter(w => !STOP_WORDS.has(w));
}

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'that', 'this', 'with', 'from', 'have',
  'are', 'was', 'not', 'but', 'you', 'all', 'can', 'has', 'had',
  'been', 'will', 'would', 'could', 'should', 'may', 'its', 'his',
  'her', 'our', 'their', 'there', 'they', 'when', 'where', 'which',
  'what', 'who', 'how', 'also', 'into', 'over', 'after', 'before',
]);

function computeTF(document, term) {
  const tokens = tokenize(document);
  const count = tokens.filter(t => t === term).length;
  return tokens.length > 0 ? count / tokens.length : 0;
}

function main() {
  const corpus = [];

  for (const source of SOURCES) {
    const filepath = path.join(ROOT, source.glob);
    if (!fs.existsSync(filepath)) {
      console.log(`  ⚠️  Not found: ${source.glob}`);
      continue;
    }

    const text = fs.readFileSync(filepath, 'utf-8');
    const chunks = chunkMarkdown(text, source.glob, source.weight);

    for (const chunk of chunks) {
      // Add token frequency map for fast retrieval
      const tokens = tokenize(chunk.text);
      const tf = {};
      for (const token of tokens) {
        tf[token] = (tf[token] || 0) + 1;
      }
      chunk.tf = tf;
      chunk.uniqueTerms = Object.keys(tf).length;
    }

    corpus.push(...chunks);
    console.log(`  ✅ ${source.glob} → ${chunks.length} chunks (weight: ${source.weight})`);
  }

  // Save vector store
  fs.mkdirSync(path.dirname(VECTOR_STORE), { recursive: true });
  fs.writeFileSync(VECTOR_STORE, JSON.stringify({
    generated: new Date().toISOString(),
    totalChunks: corpus.length,
    totalTokens: corpus.reduce((sum, c) => sum + c.tokens, 0),
    corpus,
  }, null, 2));

  console.log(`\n📦 Vector store saved: ${VECTOR_STORE}`);
  console.log(`   ${corpus.length} chunks, ~${corpus.reduce((sum, c) => sum + c.tokens, 0)} tokens`);
}

main();
