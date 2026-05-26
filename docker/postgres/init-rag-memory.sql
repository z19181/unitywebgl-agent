-- RAG Memory Database Initialization
-- Run this script as superuser (postgres) after creating database `rag_memory`

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Table: documents (metadata only)
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    path TEXT NOT NULL UNIQUE,
    absolute_path TEXT NOT NULL,
    size INTEGER NOT NULL DEFAULT 0,
    mtime TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: document_chunks (section-level chunks for Phase B)
CREATE TABLE IF NOT EXISTS document_chunks (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    content_length INTEGER NOT NULL,
    section_title TEXT,
    start_line INTEGER,
    end_line INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: document_embeddings (vector embeddings)
CREATE TABLE IF NOT EXISTS document_embeddings (
    id SERIAL PRIMARY KEY,
    chunk_id INTEGER REFERENCES document_chunks(id) ON DELETE CASCADE,
    embedding vector(1536), -- text-embedding-3-small dimensions
    model TEXT NOT NULL DEFAULT 'text-embedding-3-small',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: embedding_runs (tracking embedding generation runs)
CREATE TABLE IF NOT EXISTS embedding_runs (
    id SERIAL PRIMARY KEY,
    model TEXT NOT NULL,
    total_files INTEGER NOT NULL,
    total_chunks INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'running', -- running, completed, failed
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Table: evaluation_runs (tracking retrieval evaluation runs)
CREATE TABLE IF NOT EXISTS evaluation_runs (
    id SERIAL PRIMARY KEY,
    phase TEXT NOT NULL, -- A.1, A.2, B.1, B.2, etc.
    recall_at_5 DOUBLE PRECISION,
    precision_at_5 DOUBLE PRECISION,
    mrr DOUBLE PRECISION,
    ndcg_at_5 DOUBLE PRECISION,
    must_not_suggest_violations INTEGER DEFAULT 0,
    total_queries INTEGER NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index: ivfflat for cosine similarity search (fast approximate search)
CREATE INDEX IF NOT EXISTS idx_document_embeddings_cosine
    ON document_embeddings
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Index: document path lookup
CREATE INDEX IF NOT EXISTS idx_documents_path
    ON documents (path);

-- Index: chunk lookup by document
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id
    ON document_chunks (document_id);

-- Index: embedding lookup by chunk
CREATE INDEX IF NOT EXISTS idx_document_embeddings_chunk_id
    ON document_embeddings (chunk_id);

-- View: document_with_embedding_count (for monitoring)
CREATE OR REPLACE VIEW document_with_embedding_count AS
SELECT
    d.id,
    d.path,
    d.size,
    d.mtime,
    COUNT(de.id) AS embedding_count
FROM documents d
LEFT JOIN document_chunks dc ON d.id = dc.document_id
LEFT JOIN document_embeddings de ON dc.id = de.chunk_id
GROUP BY d.id, d.path, d.size, d.mtime;

-- Function: cosine_similarity_search (convenience wrapper)
CREATE OR REPLACE FUNCTION cosine_similarity_search(
    query_embedding vector(1536),
    match_count INTEGER DEFAULT 5
)
RETURNS TABLE (
    chunk_id INTEGER,
    document_path TEXT,
    chunk_content TEXT,
    section_title TEXT,
    similarity DOUBLE PRECISION
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.id AS chunk_id,
        d.path AS document_path,
        dc.content AS chunk_content,
        dc.section_title,
        (1 - (de.embedding <=> query_embedding)) AS similarity
    FROM document_embeddings de
    JOIN document_chunks dc ON de.chunk_id = dc.id
    JOIN documents d ON dc.document_id = d.id
    ORDER BY de.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Grant permissions (adjust as needed)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO postgres;

-- Comments for documentation
COMMENT ON TABLE documents IS 'Document metadata (path, size, mtime)';
COMMENT ON TABLE document_chunks IS 'Section-level chunks (Phase B = section, Phase A = file)';
COMMENT ON TABLE document_embeddings IS 'Vector embeddings (1536 dimensions, text-embedding-3-small)';
COMMENT ON TABLE embedding_runs IS 'Tracking embedding generation runs';
COMMENT ON TABLE evaluation_runs IS 'Tracking retrieval evaluation runs (Recall@5, MRR, etc.)';
COMMENT ON FUNCTION cosine_similarity_search IS 'Convenience wrapper for cosine similarity search';

-- Verify installation
\echo '✅ pgvector extension enabled'
\echo '✅ Tables created: documents, document_chunks, document_embeddings, embedding_runs, evaluation_runs'
\echo '✅ Indexes created: ivfflat (cosine), path, document_id, chunk_id'
\echo '✅ View created: document_with_embedding_count'
\echo '✅ Function created: cosine_similarity_search'
\dt
\d document_embeddings
