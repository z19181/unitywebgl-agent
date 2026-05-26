// ========================================
// v1.2.0 Phase B — Vector Store (pgvector)
// Manages document chunks and embeddings in PostgreSQL
// ========================================
import pg from 'pg';
const { Pool } = pg;

let pool = null;

function getPool() {
  if (!pool) {
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
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// ========================================
// Document Operations
// ========================================

async function upsertDocument(filePath, absolutePath, size, mtime) {
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
  return result.rows[0].id;
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
    `INSERT INTO document_embeddings (chunk_id, embedding, model) VALUES ($1, $2, $3)`,
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

export {
  upsertDocument, getDocumentByPath, getAllDocuments,
  insertChunk, clearChunksForDocument,
  insertEmbedding, semanticSearch,
  createEmbeddingRun, completeEmbeddingRun,
  getStats, closePool, getPool,
};
export default { upsertDocument, semanticSearch, getStats, closePool };
