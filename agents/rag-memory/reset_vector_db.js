// ========================================
// v1.2.0 Phase B.3.1 — Reset Vector DB
// Truncates all data tables (keeps schema + extensions), outputs before/after counts
// ========================================
import pg from 'pg';
const { Pool } = pg;

const config = {
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432', 10),
  database: process.env.PGDATABASE || 'ragmemory',
  user: process.env.PGUSER || 'raguser',
  password: process.env.PGPASSWORD || 'ragpass',
};

async function getTableCounts(pool) {
  const tables = ['documents', 'document_chunks', 'document_embeddings', 'embedding_runs', 'evaluation_runs'];
  const counts = {};
  for (const t of tables) {
    const r = await pool.query(`SELECT COUNT(*) as count FROM ${t}`);
    counts[t] = parseInt(r.rows[0].count);
  }
  return counts;
}

async function reset() {
  const pool = new Pool(config);

  console.log('=== Vector DB Reset ===');

  // Before counts
  const before = await getTableCounts(pool);
  console.log('Before:');
  for (const [t, c] of Object.entries(before)) {
    console.log(`  ${t}: ${c}`);
  }

  // Truncate all data tables (CASCADE handles FK, RESTART IDENTITY resets sequences)
  await pool.query(
    'TRUNCATE document_embeddings, document_chunks, documents, embedding_runs, evaluation_runs RESTART IDENTITY CASCADE'
  );
  console.log('\n✅ All tables truncated');

  // After counts
  const after = await getTableCounts(pool);
  console.log('After:');
  for (const [t, c] of Object.entries(after)) {
    console.log(`  ${t}: ${c}`);
  }

  await pool.end();
  console.log('\n=== Reset Complete ===');
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  reset().catch(err => { console.error(err); process.exit(1); });
}

export { reset };
