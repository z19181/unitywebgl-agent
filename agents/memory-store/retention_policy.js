// ========================================
// v1.3.0 Phase B.1 — Retention Policy
// Manages memory lifecycle: archive, retention, cleanup
// ========================================

import { query } from './db.js';
import { archiveMemory, getMemoriesByAgent, PermissionError } from './memory_store.js';

// ──────────────────────────────────────────────────────────────
// archiveOldWorkingMemories(agentName, olderThanDays, options)
// Archives working-type memories older than N days
// ──────────────────────────────────────────────────────────────

export async function archiveOldWorkingMemories(agentName, olderThanDays = 7, options = {}) {
  const { dryRun = false } = options;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - olderThanDays);

  const result = await query(
    `SELECT id, title, created_at FROM agent_memories
     WHERE agent_name = $1
       AND memory_type = 'working'
       AND is_archived = false
       AND created_at < $2
     ORDER BY created_at ASC`,
    [agentName, cutoff.toISOString()]
  );

  const archived = [];
  const skipped = [];

  for (const row of result.rows) {
    if (!dryRun) {
      try {
        await archiveMemory(row.id, {
          reason: `Retention: working memory older than ${olderThanDays} days`,
        });
        archived.push({ id: row.id, title: row.title, createdAt: row.created_at });
      } catch (err) {
        skipped.push({ id: row.id, title: row.title, reason: err.message });
      }
    } else {
      archived.push({ id: row.id, title: row.title, createdAt: row.created_at });
    }
  }

  return {
    candidates: result.rows.length,
    archived: archived.length,
    skipped: skipped.length,
    details: { archived, skipped },
  };
}

// ──────────────────────────────────────────────────────────────
// archiveLowConfidenceMemories(agentName, threshold, options)
// Archives memories with confidence below threshold
// Never archives governance memories
// ──────────────────────────────────────────────────────────────

export async function archiveLowConfidenceMemories(agentName, threshold = 0.3, options = {}) {
  const { dryRun = false, excludeTypes = ['governance'] } = options;

  const params = [agentName, threshold];
  let sql = `SELECT id, title, confidence, memory_type FROM agent_memories
     WHERE agent_name = $1
       AND confidence < $2
       AND is_archived = false`;

  if (excludeTypes.length > 0) {
    sql += ` AND memory_type != ALL($3)`;
    params.push(excludeTypes);
  }

  sql += ` ORDER BY confidence ASC`;

  const result = await query(sql, params);

  const archived = [];
  const skipped = [];

  for (const row of result.rows) {
    if (!dryRun) {
      try {
        await archiveMemory(row.id, {
          reason: `Retention: low confidence (${row.confidence} < ${threshold})`,
        });
        archived.push({ id: row.id, title: row.title, confidence: row.confidence });
      } catch (err) {
        skipped.push({ id: row.id, title: row.title, reason: err.message });
      }
    } else {
      archived.push({ id: row.id, title: row.title, confidence: row.confidence });
    }
  }

  return {
    candidates: result.rows.length,
    archived: archived.length,
    skipped: skipped.length,
    details: { archived, skipped },
  };
}

// ──────────────────────────────────────────────────────────────
// listArchiveCandidates(agentName, options)
// Lists memories that COULD be archived (dry-run analysis)
// ──────────────────────────────────────────────────────────────

export async function listArchiveCandidates(agentName, options = {}) {
  const {
    olderThanDays = null,
    minConfidence = null,
    excludeTypes = ['governance'],
    limit = 50,
  } = options;

  const params = [agentName];
  let idx = 2;
  let sql = `SELECT id, title, memory_type, confidence, importance, created_at, updated_at
     FROM agent_memories
     WHERE agent_name = $1
       AND is_archived = false`;

  if (excludeTypes.length > 0) {
    sql += ` AND memory_type != ALL($${idx++})`;
    params.push(excludeTypes);
  }

  if (olderThanDays) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);
    sql += ` AND created_at < $${idx++}`;
    params.push(cutoff.toISOString());
  }

  if (minConfidence !== null) {
    sql += ` AND confidence < $${idx++}`;
    params.push(minConfidence);
  }

  sql += ` ORDER BY confidence ASC, created_at ASC LIMIT $${idx++}`;
  params.push(limit);

  const result = await query(sql, params);

  return result.rows.map(row => ({
    id: row.id,
    title: row.title,
    memoryType: row.memory_type,
    confidence: parseFloat(row.confidence),
    importance: row.importance,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    candidateReasons: [
      olderThanDays && `Older than ${olderThanDays} days`,
      minConfidence !== null && row.confidence < minConfidence && `Low confidence: ${row.confidence}`,
    ].filter(Boolean),
  }));
}

// ──────────────────────────────────────────────────────────────
// isGovernanceMemory(memoryId) → boolean
// ──────────────────────────────────────────────────────────────

export async function isGovernanceMemory(memoryId) {
  const result = await query(
    `SELECT memory_type FROM agent_memories WHERE id = $1`,
    [memoryId]
  );
  return result.rows.length > 0 && result.rows[0].memory_type === 'governance';
}

// ──────────────────────────────────────────────────────────────
// archiveExpiredMemories(agentName, options) → combined cleanup
// Runs both working + low-confidence checks in one pass
// ──────────────────────────────────────────────────────────────

export async function archiveExpiredMemories(agentName, options = {}) {
  const {
    workingOlderThanDays = 7,
    confidenceThreshold = 0.3,
    dryRun = false,
  } = options;

  const workingResult = await archiveOldWorkingMemories(agentName, workingOlderThanDays, { dryRun });
  const confidenceResult = await archiveLowConfidenceMemories(agentName, confidenceThreshold, { dryRun });

  return {
    dryRun,
    working: workingResult,
    lowConfidence: confidenceResult,
    totalArchived: workingResult.archived + confidenceResult.archived,
    totalSkipped: workingResult.skipped + confidenceResult.skipped,
    totalCandidates: workingResult.candidates + confidenceResult.candidates,
  };
}

// ──────────────────────────────────────────────────────────────
// CLI mode
// ──────────────────────────────────────────────────────────────

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const agentName = process.argv[2] || 'qclaw';
  const dryRun = process.argv.includes('--dry-run');
  const action = process.argv.includes('--list') ? 'list' : 'run';

  try {
    if (action === 'list') {
      const candidates = await listArchiveCandidates(agentName);
      console.log(`Archive candidates for ${agentName}:`);
      if (candidates.length === 0) {
        console.log('  (none)');
      } else {
        for (const c of candidates) {
          console.log(`  ${c.title} [${c.memoryType}] conf=${c.confidence} imp=${c.importance}`);
        }
      }
    } else {
      const result = await archiveExpiredMemories(agentName, { dryRun });
      console.log(`Retention run for ${agentName} (${dryRun ? 'DRY RUN' : 'LIVE'}):`);
      console.log(`  Working memories archived: ${result.working.archived}`);
      console.log(`  Low-confidence archived:   ${result.lowConfidence.archived}`);
      console.log(`  Skipped (errors):          ${result.totalSkipped}`);
      console.log(`  Total archived:            ${result.totalArchived}`);
    }

    const { closePool } = await import('./db.js');
    await closePool();
    process.exit(0);
  } catch (err) {
    console.error('Retention failed:', err.message);
    const { closePool } = await import('./db.js');
    await closePool();
    process.exit(1);
  }
}
