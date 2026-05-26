// Debug similarity scores for Material Policy
import { embedText } from './embedder.js';
import pg from 'pg';

async function debug() {
  const embedding = await embedText('Unity WebGL material policy');
  console.log('Query embedding length:', embedding.length);
  
  const pool = new pg.Pool({ connectionString: 'postgres://raguser:ragpass@localhost:5432/ragmemory' });
  
  // Check Material Policy chunks
  const mpResult = await pool.query(
    `SELECT
       d.path,
       dc.id as chunk_id,
       LEFT(dc.content, 150) as preview,
       (1 - (de.embedding <=> $1::vector)) AS similarity
     FROM document_embeddings de
     JOIN document_chunks dc ON de.chunk_id = dc.id
     JOIN documents d ON dc.document_id = d.id
     WHERE d.path LIKE '%MATERIAL_POLICY%'
     ORDER BY de.embedding <=> $1::vector`,
    ['[' + embedding.join(',') + ']']
  );
  
  console.log('\n=== Material Policy chunks similarity ===');
  for (const row of mpResult.rows) {
    console.log(`Chunk ${row.chunk_id}: similarity=${row.similarity.toFixed(4)}`);
    console.log(`  Preview: ${row.preview.slice(0, 80)}...`);
  }
  
  // Check top 5 overall
  const top5Result = await pool.query(
    `SELECT
       d.path,
       dc.id as chunk_id,
       LEFT(dc.content, 150) as preview,
       (1 - (de.embedding <=> $1::vector)) AS similarity
     FROM document_embeddings de
     JOIN document_chunks dc ON de.chunk_id = dc.id
     JOIN documents d ON dc.document_id = d.id
     ORDER BY de.embedding <=> $1::vector
     LIMIT 10`,
    ['[' + embedding.join(',') + ']']
  );
  
  console.log('\n=== Top 10 overall ===');
  for (const row of top5Result.rows) {
    console.log(`Chunk ${row.chunk_id} (${row.path}): similarity=${row.similarity.toFixed(4)}`);
    console.log(`  Preview: ${row.preview.slice(0, 80)}...`);
  }
  
  await pool.end();
}

debug().catch(console.error);