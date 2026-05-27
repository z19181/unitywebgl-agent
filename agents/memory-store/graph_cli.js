// ========================================
// v1.3.0 Phase B.2 — Graph Query CLI
// Usage: node graph_cli.js <command> <id>
// ========================================

import {
  getMemoryGraph, getAgentGraph, getDecisionTrail, getRetrievalTrail,
  getRelatedMemories, findContradictions, findSupersededMemories,
  getGraphSummary,
} from './runtime_graph.js';
import { closePool } from './db.js';

function formatJSON(obj) {
  return JSON.stringify(obj, null, 2);
}

function formatReadable(obj) {
  const lines = [];

  if (obj.nodes && obj.edges) {
    // Graph output
    lines.push('=== Graph ===');
    lines.push(`Nodes: ${obj.nodes.length}`);
    for (const n of obj.nodes) {
      const icon = n.type === 'agent' ? '🤖' : n.type === 'memory' ? '🧠' :
                   n.type === 'retrieval' ? '🔍' : '⚖️';
      const archived = n.data?.is_archived ? ' [ARCHIVED]' : '';
      lines.push(`  ${icon} [${n.type}] ${n.label || n.id}${archived}`);
    }
    lines.push('');
    lines.push(`Edges: ${obj.edges.length}`);
    for (const e of obj.edges) {
      const arrow = e.relationType === 'contradicts' ? '⚠️→' :
                    e.relationType === 'supersedes' ? '🔄→' :
                    e.relationType === 'depends_on' ? '📎→' :
                    e.relationType === 'validates' ? '✅→' :
                    e.relationType === 'blocks' ? '🚫→' : '→';
      lines.push(`  [${e.fromType}] ${arrow} [${e.toType}] : ${e.relationType} (w=${e.weight?.toFixed(2)})`);
    }
  } else if (Array.isArray(obj)) {
    // Array output (trails, related, etc.)
    if (obj.length === 0) {
      lines.push('  (no results)');
    } else {
      for (const item of obj) {
        if (item.decision) {
          lines.push(`  ⚖️ ${item.decision.rule_name} → ${item.decision.decision}`);
          if (item.memory) lines.push(`     Memory: ${item.memory.title}`);
        } else if (item.queryText) {
          lines.push(`  🔍 "${item.queryText.slice(0, 60)}" (${item.mode}, ${item.memories.length} memories)`);
          for (const m of item.memories) {
            lines.push(`     🧠 ${m.title}`);
          }
        } else if (item.relationType) {
          lines.push(`  ${item.relationType} → ${item.toTitle || item.toId}`);
        } else {
          lines.push(`  ${JSON.stringify(item).slice(0, 100)}`);
        }
      }
    }
  } else if (obj.contradicts && obj.contradictedBy) {
    lines.push('=== Contradictions ===');
    lines.push(`Contradicts ${obj.contradicts.length} memories:`);
    for (const c of obj.contradicts) lines.push(`  ⚠️→ ${c.title}`);
    lines.push(`Contradicted by ${obj.contradictedBy.length} memories:`);
    for (const c of obj.contradictedBy) lines.push(`  ←⚠️ ${c.title}`);
  } else if (obj.supersedes && obj.supersededBy) {
    lines.push('=== Superseded ===');
    lines.push(`Supersedes ${obj.supersedes.length} memories:`);
    for (const s of obj.supersedes) lines.push(`  🔄→ ${s.title}`);
    lines.push(`Superseded by ${obj.supersededBy.length} memories:`);
    for (const s of obj.supersededBy) lines.push(`  ←🔄 ${s.title}`);
  } else if (obj.totalMemories !== undefined) {
    // Summary
    lines.push('=== Graph Summary ===');
    lines.push(`Total Memories:  ${obj.totalMemories}`);
    lines.push(`Total Edges:     ${obj.totalEdges}`);
    lines.push(`Total Decisions: ${obj.totalDecisions}`);
    lines.push(`Agent Filter:    ${obj.agentFilter}`);
    if (obj.topRelations.length > 0) {
      lines.push('Top Relations:');
      for (const r of obj.topRelations) {
        lines.push(`  ${r.type}: ${r.count}`);
      }
    }
  } else if (obj.totalArchived !== undefined) {
    // Retention
    lines.push(JSON.stringify(obj, null, 2));
  } else {
    lines.push(JSON.stringify(obj, null, 2));
  }

  return lines.join('\n');
}

// ──────────────────────────────────────────────────────────────
// CLI
// ──────────────────────────────────────────────────────────────

const command = process.argv[2];
const target = process.argv[3];
const extra = process.argv[4];
const format = process.argv.includes('--json') ? 'json' : 'readable';

async function run(command, target, extra) {
  try {
    let result;
    switch (command) {
      case 'memory':
      case 'graph':
        result = await getMemoryGraph(target, { depth: parseInt(extra) || 2 });
        break;
      case 'agent':
        result = await getAgentGraph(target, { limit: parseInt(extra) || 50 });
        break;
      case 'retrieval':
        result = await getRetrievalTrail(target);
        break;
      case 'decision':
      case 'trail':
        result = await getDecisionTrail(target);
        break;
      case 'related':
        result = await getRelatedMemories(target, extra ? [extra] : null);
        break;
      case 'contradictions':
        result = await findContradictions(target);
        break;
      case 'superseded':
        result = await findSupersededMemories(target);
        break;
      case 'summary':
        result = await getGraphSummary({ agentName: target === 'all' ? null : target });
        break;
      default:
        console.log('Usage: node graph_cli.js <command> <id>');
        console.log('Commands: memory, agent, retrieval, decision, related, contradictions, superseded, summary');
        console.log('Options: --json (output JSON)');
        await closePool();
        process.exit(1);
    }

    if (format === 'json') {
      console.log(formatJSON(result));
    } else {
      console.log(formatReadable(result));
    }
    await closePool();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    await closePool();
    process.exit(1);
  }
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  if (!command) {
    console.log('Usage: node graph_cli.js <command> <id>');
    console.log('Commands:');
    console.log('  memory <memoryId>         — Memory graph');
    console.log('  agent <agentName>         — Agent graph');
    console.log('  retrieval <queryHash>     — Retrieval trail');
    console.log('  decision <memoryId>       — Decision trail');
    console.log('  related <memoryId>        — Related memories');
    console.log('  contradictions <memoryId> — Contradiction analysis');
    console.log('  superseded <memoryId>     — Superseded analysis');
    console.log('  summary [agentName|all]   — Graph summary');
    process.exit(0);
  }
  await run(command, target, extra);
}
