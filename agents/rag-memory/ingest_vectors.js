// ========================================
// v1.2.0 Phase B - Ingest Pipeline
// Scans project files → chunks → embeddings → pgvector
// ========================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { embedBatch, getProviderInfo } from './embedder.js';
import * as store from './vector_store.js';
import { chunkBySections, computeChunkStats, validateChunkQuality } from './chunking/semantic_chunker.js';
import 'dotenv/config';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

// Inline scan logic (avoids CJS/ESM mismatch with build_index.js)
const EXCLUDE_PATTERNS = ['node_modules', '.git', 'Library', 'agent-dashboard/node_modules', '*.log', '*.tmp', '.qclaw_handoff'];
const ROOT_MD_WHITELIST = ['README.md', 'CHANGELOG.md', 'LICENSE.md', 'BASELINE.md'];

function shouldExclude(filePath) {
  const relativePath = path.relative(PROJECT_ROOT, filePath);
  return EXCLUDE_PATTERNS.some(p => relativePath.includes(p.replace(/\*/g, '')));
}

function scanDirectory(dirPath, extensions = ['.md']) {
  const results = [];
  if (!fs.existsSync(dirPath)) return results;
  const items = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const item of items) {
    const itemPath = path.join(dirPath, item.name);
    if (shouldExclude(itemPath)) continue;
    if (item.isDirectory()) results.push(...scanDirectory(itemPath, extensions));
    else if (extensions.includes(path.extname(item.name))) results.push(itemPath);
  }
  return results;
}



// ========================================
// Main Ingestion Pipeline
// ========================================

async function ingest({ force = false } = {}) {
  console.log('[Ingest] Starting vector ingestion pipeline...');

  // 1. Scan files (reuse build_index.js scanner)
  console.log('[Ingest] Scanning project files...');
  const targetDirs = [
    path.join(PROJECT_ROOT, 'docs'),
    path.join(PROJECT_ROOT, 'agents'),
    path.join(PROJECT_ROOT, 'UnityExamples'),
    PROJECT_ROOT,
  ];

  const rootMdWhitelist = ['README.md', 'CHANGELOG.md', 'LICENSE.md', 'BASELINE.md'];
  let allFiles = [];

  for (const dir of targetDirs) {
    if (dir === PROJECT_ROOT) {
      for (const f of rootMdWhitelist) {
        const fp = path.join(dir, f);
        if (fs.existsSync(fp)) allFiles.push(fp);
      }
    } else if (dir.endsWith('agents')) {
      const files = scanDirectory(dir, ['.md']);
      allFiles.push(...files.filter(f => f.endsWith('SOUL.md') || f.endsWith('IMPLEMENTATION.md') || f.endsWith('PROMPT.md') || f.endsWith('POLICY.md')));
    } else {
      allFiles.push(...scanDirectory(dir, ['.md']));
    }
  }

  allFiles = [...new Set(allFiles)].filter(f => !shouldExclude(f));
  console.log(`[Ingest] Found ${allFiles.length} files to ingest`);

  // 2. Create embedding run
  const providerInfo = await getProviderInfo();
  const runId = await store.createEmbeddingRun(providerInfo.model, allFiles.length);
  console.log(`[Ingest] Created embedding run: ${runId}`);

  let totalChunks = 0;
  let totalEmbeddings = 0;
  const allChunkTexts = [];
  const chunkMeta = []; // parallel array tracking metadata

  // 3. Chunk all documents
  console.log('[Ingest] Chunking documents...');
  for (const filePath of allFiles) {
    const content = fs.readFileSync(filePath, 'utf-8');
    if (content.trim().length === 0) continue;

    const relativePath = path.relative(PROJECT_ROOT, filePath);
    const stat = fs.statSync(filePath);
    const chunks = chunkBySections(content, filePath);

    // Upsert document
    const docId = await store.upsertDocument(relativePath, filePath, stat.size, stat.mtime.toISOString());

    if (force) {
      await store.clearChunksForDocument(docId);
    }

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkId = await store.insertChunk(docId, i, chunk.content, {
        heading_path: chunk.metadata.heading_path.join(' > '),
        heading_level: chunk.metadata.heading_level,
        char_count: chunk.metadata.char_count,
        token_estimate: chunk.metadata.token_estimate,
        is_governance: chunk.metadata.is_governance,
        is_hard_constraint: chunk.metadata.is_hard_constraint,
        has_body: chunk.metadata.has_body,
      });
      allChunkTexts.push(chunk.content);
      chunkMeta.push({ chunkId, docId, path: relativePath, metadata: chunk.metadata });
      totalChunks++; 
    }
  }

  console.log(`[Ingest] Created ${totalChunks} chunks`);

  // 3.5 Validate chunk quality
  const allChunks = [];
  for (const filePath of allFiles) {
    const content = fs.readFileSync(filePath, 'utf-8');
    if (content.trim().length === 0) continue;
    const chunks = chunkBySections(content, filePath);
    allChunks.push(...chunks);
  }
  const chunkStats = computeChunkStats(allChunks);
  const qualityCheck = validateChunkQuality(chunkStats);

  console.log('[Ingest] Chunk quality stats:');
  console.log(`  Total chunks: ${chunkStats.total_chunks}`);
  console.log(`  Header-only chunks: ${chunkStats.header_only_chunks}`);
  console.log(`  Avg chunk chars: ${chunkStats.avg_chunk_chars}`);
  console.log(`  Median chunk chars: ${chunkStats.median_chunk_chars}`);
  console.log(`  Chunks < 80 chars: ${chunkStats.chunks_under_80}`);
  console.log(`  Chunks > 2200 chars: ${chunkStats.chunks_over_2200}`);
  console.log(`  Hard constraint chunks: ${chunkStats.hard_constraint_chunks}`);
  console.log(`  Governance chunks: ${chunkStats.governance_chunks}`);

  if (!qualityCheck.passed) {
    console.log('[Ingest] ⚠️  Chunk quality issues:');
    qualityCheck.issues.forEach(i => console.log(`    - ${i}`));
  } else {
    console.log('[Ingest] ✅ Chunk quality validation passed');
  }

  // 4. Generate embeddings (batched)
  console.log(`[Ingest] Generating embeddings for ${allChunkTexts.length} chunks...`);
  console.log(`[Ingest] Model: ${providerInfo.model} (${providerInfo.dimensions} dims, ${providerInfo.provider})`);

  try {
    const embeddings = await embedBatch(allChunkTexts, {
      onProgress: ({ completed, total }) => {
        if (completed % 20 === 0 || completed === total) {
          console.log(`[Ingest] Embedding progress: ${completed}/${total}`);
        }
      },
    });

    // 5. Store embeddings
    console.log('[Ingest] Storing embeddings in pgvector...');
    for (let i = 0; i < embeddings.length; i++) {
      await store.insertEmbedding(chunkMeta[i].chunkId, embeddings[i], providerInfo.model);
      totalEmbeddings++;
    }

    await store.completeEmbeddingRun(runId, totalChunks, 'completed');
    console.log(`[Ingest] ✅ SUCCESS: ${totalEmbeddings} embeddings stored`);
  } catch (err) {
    await store.completeEmbeddingRun(runId, totalChunks, 'failed', err.message);
    console.error(`[Ingest] ❌ FAILED: ${err.message}`);
    throw err;
  } finally {
    await store.closePool();
  }

  // 6. Print stats
  const stats = await store.getStats();
  console.log(`[Ingest] Database stats: ${JSON.stringify(stats)}`);

  return { totalChunks, totalEmbeddings, runId };
}

// ========================================
// Main
// ========================================

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const force = process.argv.includes('--force');
  ingest({ force }).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

export { ingest, chunkBySections };
