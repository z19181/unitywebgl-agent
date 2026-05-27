// ========================================
// v1.2.0 Phase B — Vector Store (pgvector)
// Manages document chunks and embeddings in PostgreSQL
// ========================================
import pg from 'pg';
const { Pool } = pg;

let pool = null;

function getPool() {
  if (!pool || pool.ended) {
    if (pool && pool.ended) {
      pool = null; // clear dead pool
    }
    const config = {
      host: process.env.PGHOST || 'localhost',
      port: parseInt(process.env.PGPORT || '5432', 10),
      database: process.env.PGDATABASE || 'ragmemory',
      user: process.env.PGUSER || 'raguser',
      password: process.env.PGPASSWORD || 'ragpass',
    };
    pool = new Pool(config);
  }
  return pool;
}

async function closePool() {
  if (pool && !pool.ended) {
    await pool.end();
  }
  pool = null;
}

let _migrationDone = false;

async function ensureMigrations() {
  if (_migrationDone) return;
  const p = getPool();
  // Add unique constraint on (chunk_id, model) if not exists
  const constraintExists = await p.query(
    "SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'unique_chunk_model' AND table_name = 'document_embeddings'"
  );
  if (constraintExists.rows.length === 0) {
    // First remove duplicates that would block constraint creation
    await p.query(
      `DELETE FROM document_embeddings a USING document_embeddings b
       WHERE a.id > b.id AND a.chunk_id = b.chunk_id AND a.model = b.model`
    );
    await p.query(
      `ALTER TABLE document_embeddings ADD CONSTRAINT unique_chunk_model UNIQUE (chunk_id, model)`
    );
    console.log('[Migration] Added unique_chunk_model constraint to document_embeddings');
  }
  _migrationDone = true;
}

async function upsertDocument(filePath, absolutePath, size, mtime) {
  await ensureMigrations();
  const p = getPool();
  const result = await p.query(
    `INSERT INTO documents (path, absolute_path, size, mtime)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (path) DO UPDATE SET
       absolute_path = EXCLUDED.absolute_path,
       size = EXCLUDED.size,
       mtime = EXCLUDED.mtime,
       updated_at = NOW()
     RETURNING id`,
    [filePath, absolutePath, size, mtime]
  );
  const docId = result.rows[0].id;

  // Clean up old chunks + embeddings for this document before re-ingest
  await p.query(
    `DELETE FROM document_embeddings
     WHERE chunk_id IN (SELECT id FROM document_chunks WHERE document_id = $1)`,
    [docId]
  );
  await p.query('DELETE FROM document_chunks WHERE document_id = $1', [docId]);

  return docId;
}

async function getDocumentByPath(filePath) {
  const p = getPool();
  const result = await p.query('SELECT * FROM documents WHERE path = $1', [filePath]);
  return result.rows[0] || null;
}

async function getAllDocuments() {
  const p = getPool();
  const result = await p.query('SELECT * FROM documents ORDER BY path');
  return result.rows;
}

// ========================================
// Chunk Operations
// ========================================

async function insertChunk(documentId, chunkIndex, content, { sectionTitle, startLine, endLine } = {}) {
  const p = getPool();
  const result = await p.query(
    `INSERT INTO document_chunks (document_id, chunk_index, content, content_length, section_title, start_line, end_line)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [documentId, chunkIndex, content, content.length, sectionTitle || null, startLine || null, endLine || null]
  );
  return result.rows[0].id;
}

async function clearChunksForDocument(documentId) {
  const p = getPool();
  await p.query('DELETE FROM document_chunks WHERE document_id = $1', [documentId]);
}

// ========================================
// Embedding Operations
// ========================================

async function insertEmbedding(chunkId, embedding, model = 'text-embedding-3-small') {
  const p = getPool();
  const embeddingStr = `[${embedding.join(',')}]`;
  await p.query(
    `INSERT INTO document_embeddings (chunk_id, embedding, model)
     VALUES ($1, $2, $3)
     ON CONFLICT (chunk_id, model)
     DO UPDATE SET embedding = EXCLUDED.embedding, created_at = NOW()`,
    [chunkId, embeddingStr, model]
  );
}

// ========================================
// Semantic Search
// ========================================

async function semanticSearch(queryEmbedding, { topK = 5, minSimilarity = 0.0 } = {}) {
  const p = getPool();
  const embeddingStr = `[${queryEmbedding.join(',')}]`;
  const result = await p.query(
    `SELECT
       dc.id AS chunk_id,
       d.path AS document_path,
       dc.content AS chunk_content,
       dc.section_title,
       (1 - (de.embedding <=> $1::vector)) AS similarity,
     dc.char_count
     FROM document_embeddings de
     JOIN document_chunks dc ON de.chunk_id = dc.id
     JOIN documents d ON dc.document_id = d.id
     WHERE (1 - (de.embedding <=> $1::vector)) >= $2
     ORDER BY de.embedding <=> $1::vector
     LIMIT $3`,
    [embeddingStr, minSimilarity, topK]
  );
  return result.rows.map(row => ({
    chunkId: row.chunk_id,
    documentPath: row.document_path,
    content: row.chunk_content,
    sectionTitle: row.section_title,
    similarity: parseFloat(row.similarity),
    charCount: row.char_count || 200,
  }));
}

// ========================================
// Embedding Run Tracking
// ========================================

async function createEmbeddingRun(model, totalFiles) {
  const p = getPool();
  const result = await p.query(
    `INSERT INTO embedding_runs (model, total_files, total_chunks) VALUES ($1, $2, 0) RETURNING id`,
    [model, totalFiles]
  );
  return result.rows[0].id;
}

async function completeEmbeddingRun(runId, totalChunks, status = 'completed', errorMessage = null) {
  const p = getPool();
  await p.query(
    `UPDATE embedding_runs SET total_chunks = $2, status = $3, error_message = $4, completed_at = NOW() WHERE id = $1`,
    [runId, totalChunks, status, errorMessage]
  );
}

// ========================================
// Utility
// ========================================

async function getStats() {
  const p = getPool();
  const docs = await p.query('SELECT COUNT(*) as count FROM documents');
  const chunks = await p.query('SELECT COUNT(*) as count FROM document_chunks');
  const embeddings = await p.query('SELECT COUNT(*) as count FROM document_embeddings');
  return {
    documents: parseInt(docs.rows[0].count),
    chunks: parseInt(chunks.rows[0].count),
    embeddings: parseInt(embeddings.rows[0].count),
  };
}

async function countDuplicateEmbeddings() {
  const p = getPool();
  const result = await p.query(
    'SELECT COUNT(*) as count FROM (SELECT chunk_id, model FROM document_embeddings GROUP BY chunk_id, model HAVING COUNT(*) > 1) dupes'
  );
  return parseInt(result.rows[0].count);
}

async function countOrphanEmbeddings() {
  const p = getPool();
  const result = await p.query(
    'SELECT COUNT(*) as count FROM document_embeddings de WHERE NOT EXISTS (SELECT 1 FROM document_chunks dc WHERE dc.id = de.chunk_id)'
  );
  return parseInt(result.rows[0].count);
}

async function validateVectorStoreIntegrity() {
  const stats = await getStats();
  const duplicateCount = await countDuplicateEmbeddings();
  const orphanCount = await countOrphanEmbeddings();
  const p = getPool();

  // Chunks without documents
  const orphanChunks = await p.query(
    'SELECT COUNT(*) as count FROM document_chunks dc WHERE NOT EXISTS (SELECT 1 FROM documents d WHERE d.id = dc.document_id)'
  );
  const orphanChunkCount = parseInt(orphanChunks.rows[0].count);

  // Model count (distinct models)
  const modelCount = await p.query('SELECT COUNT(DISTINCT model) as count FROM document_embeddings');
  const numModels = parseInt(modelCount.rows[0].count) || 1;

  const maxExpectedEmbeddings = stats.chunks * numModels;
  const issues = [];

  if (stats.embeddings > maxExpectedEmbeddings) {
    issues.push(`embeddings (${stats.embeddings}) > chunks (${stats.chunks}) * models (${numModels}) = ${maxExpectedEmbeddings}`);
  }
  if (duplicateCount > 0) {
    issues.push(`duplicate chunk_id+model pairs: ${duplicateCount}`);
  }
  if (orphanCount > 0) {
    issues.push(`orphan embeddings (no matching chunk): ${orphanCount}`);
  }
  if (orphanChunkCount > 0) {
    issues.push(`orphan chunks (no matching document): ${orphanChunkCount}`);
  }

  return {
    valid: issues.length === 0,
    stats,
    duplicateEmbeddings: duplicateCount,
    orphanEmbeddings: orphanCount,
    orphanChunks: orphanChunkCount,
    issues,
  };
}

export {
  upsertDocument, getDocumentByPath, getAllDocuments,
  insertChunk, clearChunksForDocument,
  insertEmbedding, semanticSearch,
  createEmbeddingRun, completeEmbeddingRun,
  getStats, closePool, getPool,
  countDuplicateEmbeddings, countOrphanEmbeddings,
  validateVectorStoreIntegrity,
};
export default { upsertDocument, semanticSearch, getStats, closePool };
