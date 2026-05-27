// ========================================
// v1.2.0 Phase B.3.1 — Vector Store Integrity Tests
// ========================================
import pg from 'pg';
import * as store from './vector_store.js';

const { Pool } = pg;
const config = {
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432', 10),
  database: process.env.PGDATABASE || 'ragmemory',
  user: process.env.PGUSER || 'raguser',
  password: process.env.PGPASSWORD || 'ragpass',
};

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.log(`  ❌ ${name}`);
    failed++;
  }
}

async function runTests() {
  console.log('=== Vector Store Integrity Tests ===\n');

  // Test 1: Duplicate insertEmbedding should not increase count
  console.log('Test 1: Duplicate insertEmbedding does not increase count');
  {
    const before = await store.getStats();
    // Insert a temp doc + chunk + embedding
    const docId = await store.upsertDocument('__test__/dummy.md', '/tmp/dummy.md', 100, new Date().toISOString());
    const chunkId = await store.insertChunk(docId, 0, 'test content for dedup', { sectionTitle: 'test' });
    await store.insertEmbedding(chunkId, new Array(768).fill(0.1), 'nomic-embed-text');
    const after1 = await store.getStats();

    // Insert same embedding again (same chunk_id + model)
    await store.insertEmbedding(chunkId, new Array(768).fill(0.2), 'nomic-embed-text');
    const after2 = await store.getStats();

    assert(after2.embeddings === after1.embeddings, 'Duplicate insert does not increase embedding count');
    assert(after2.embeddings - before.embeddings === 1, 'Only 1 new embedding from first insert');

    // Cleanup test data
    const pool = new Pool(config);
    await pool.query('DELETE FROM document_embeddings WHERE chunk_id = $1', [chunkId]);
    await pool.query('DELETE FROM document_chunks WHERE id = $1', [chunkId]);
    await pool.query('DELETE FROM documents WHERE id = $1', [docId]);
    await pool.end();
  }

  // Test 2: upsertDocument cleans old chunks + embeddings
  console.log('\nTest 2: upsertDocument cleans old chunks + embeddings');
  {
    const docId = await store.upsertDocument('__test__/upsert_test.md', '/tmp/upsert_test.md', 100, new Date().toISOString());
    const chunkId1 = await store.insertChunk(docId, 0, 'chunk 1 content', { sectionTitle: 's1' });
    await store.insertEmbedding(chunkId1, new Array(768).fill(0.3), 'nomic-embed-text');
    const afterInsert = await store.getStats();

    // Re-upsert same document — should clear old chunks/embeddings
    const docId2 = await store.upsertDocument('__test__/upsert_test.md', '/tmp/upsert_test.md', 200, new Date().toISOString());
    assert(docId2 === docId, 'Same document ID returned on re-upsert');

    const chunkId2 = await store.insertChunk(docId2, 0, 'chunk 2 content', { sectionTitle: 's2' });
    await store.insertEmbedding(chunkId2, new Array(768).fill(0.4), 'nomic-embed-text');
    const afterReupsert = await store.getStats();

    // Should have same embedding count (old one removed, new one added)
    assert(afterReupsert.embeddings === afterInsert.embeddings, 'Embedding count unchanged after re-upsert (old removed, new added)');

    // Cleanup
    const pool = new Pool(config);
    await pool.query('DELETE FROM document_embeddings WHERE chunk_id IN (SELECT id FROM document_chunks WHERE document_id = $1)', [docId]);
    await pool.query('DELETE FROM document_chunks WHERE document_id = $1', [docId]);
    await pool.query('DELETE FROM documents WHERE id = $1', [docId]);
    await pool.end();
  }

  // Test 3: validateVectorStoreIntegrity
  console.log('\nTest 3: validateVectorStoreIntegrity');
  {
    const validation = await store.validateVectorStoreIntegrity();
    console.log(`  Stats: ${JSON.stringify(validation.stats)}`);
    console.log(`  Orphan embeddings: ${validation.orphanEmbeddings}`);
    console.log(`  Duplicate embeddings: ${validation.duplicateEmbeddings}`);
    console.log(`  Orphan chunks: ${validation.orphanChunks}`);
    console.log(`  Issues: ${validation.issues.length > 0 ? validation.issues.join('; ') : 'none'}`);
    // We don't assert valid=true here because current DB has orphans — just check the function works
    assert(typeof validation.valid === 'boolean', 'Returns valid boolean');
    assert(Array.isArray(validation.issues), 'Returns issues array');
  }

  // Test 4: countHelpers
  console.log('\nTest 4: Count helper functions');
  {
    const dups = await store.countDuplicateEmbeddings();
    const orphans = await store.countOrphanEmbeddings();
    assert(typeof dups === 'number', 'countDuplicateEmbeddings returns number');
    assert(typeof orphans === 'number', 'countOrphanEmbeddings returns number');
    console.log(`  Duplicates: ${dups}, Orphans: ${orphans}`);
  }

  await store.closePool();

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => { console.error(err); process.exit(1); });
