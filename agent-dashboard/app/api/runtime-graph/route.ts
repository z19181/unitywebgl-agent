// ========================================
// GET /api/runtime-graph — graph data (read-only)
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://raguser:ragpass@localhost:5432/ragmemory',
  max: 5,
});

function withCORS(res: NextResponse) {
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS');
  return res;
}

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const memoryId = searchParams.get('memoryId');
    const agentName = searchParams.get('agentName');
    const summary = searchParams.get('summary') === '1';
    const depth = parseInt(searchParams.get('depth') || '2');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);

    if (summary) {
      // Graph summary
      const memCount = await pool.query(`SELECT COUNT(*) as c FROM agent_memories WHERE is_archived = false`);
      const edgeCount = await pool.query(`SELECT COUNT(*) as c FROM memory_edges`);
      const govCount = await pool.query(`SELECT COUNT(*) as c FROM governance_audit_log`);
      const topRel = await pool.query(
        `SELECT relation_type, COUNT(*) as cnt FROM memory_edges GROUP BY relation_type ORDER BY cnt DESC LIMIT 10`
      );

      return withCORS(NextResponse.json({
        totalMemories: parseInt(memCount.rows[0].c),
        totalEdges: parseInt(edgeCount.rows[0].c),
        totalDecisions: parseInt(govCount.rows[0].c),
        topRelations: topRel.rows.map(r => ({ type: r.relation_type, count: parseInt(r.cnt) })),
        agentFilter: agentName || 'all',
        archivedIncluded: false,
        source: 'live',
      }));
    }

    if (memoryId) {
      // Memory graph
      const memResult = await pool.query(`SELECT * FROM agent_memories WHERE id = $1 AND is_archived = false`, [memoryId]);
      if (memResult.rows.length === 0) {
        return withCORS(NextResponse.json({ error: 'Not found' }, { status: 404 }));
      }

      const nodes = [{ type: 'memory', id: memoryId, label: memResult.rows[0].title, data: memResult.rows[0] }];
      const edges: unknown[] = [];

      // Agent node
      const agentResult = await pool.query(`SELECT * FROM agents WHERE id = $1`, [memResult.rows[0].agent_id]);
      if (agentResult.rows.length > 0) {
        nodes.push({ type: 'agent', id: agentResult.rows[0].id, label: agentResult.rows[0].name, data: agentResult.rows[0] });
        edges.push({ id: `fk-${agentResult.rows[0].id}-${memoryId}`, fromType: 'agent', fromId: agentResult.rows[0].id, toType: 'memory', toId: memoryId, relationType: 'created', weight: 1.0, metadata: {} });
      }

      // Memory edges
      const edgeResult = await pool.query(`SELECT * FROM memory_edges WHERE from_memory_id = $1 OR to_memory_id = $1`, [memoryId]);
      for (const e of edgeResult.rows) {
        const otherId = e.from_memory_id === memoryId ? e.to_memory_id : e.from_memory_id;
        try {
          const other = await pool.query(`SELECT title FROM agent_memories WHERE id = $1`, [otherId]);
          if (other.rows.length > 0) {
            nodes.push({ type: 'memory', id: otherId, label: other.rows[0].title, data: {} });
          }
        } catch (_) {}
        edges.push({
          id: e.id, fromType: 'memory', fromId: e.from_memory_id,
          toType: 'memory', toId: e.to_memory_id,
          relationType: e.relation_type, weight: parseFloat(e.weight), metadata: e.metadata || {},
        });
      }

      // Retrieval edges
      const retResult = await pool.query(
        `SELECT id, query_text, mode FROM retrieval_history WHERE retrieved_memory_ids @> ARRAY[$1]::uuid[] ORDER BY created_at DESC LIMIT 10`,
        [memoryId]
      );
      for (const r of retResult.rows) {
        nodes.push({ type: 'retrieval', id: r.id, label: r.query_text?.slice(0, 60) || '(redacted)', data: r });
        edges.push({ id: `ret-${r.id}-${memoryId}`, fromType: 'retrieval', fromId: r.id, toType: 'memory', toId: memoryId, relationType: 'retrieved', weight: 0.5, metadata: { mode: r.mode } });
      }

      return withCORS(NextResponse.json({ nodes, edges, source: 'live' }));
    }

    if (agentName) {
      // Agent graph
      const agentResult = await pool.query(`SELECT * FROM agents WHERE name = $1`, [agentName]);
      if (agentResult.rows.length === 0) {
        return withCORS(NextResponse.json({ error: 'Not found' }, { status: 404 }));
      }
      const agent = agentResult.rows[0];

      const nodes = [{ type: 'agent', id: agent.id, label: agent.name, data: agent }];
      const edges: unknown[] = [];

      const memResult = await pool.query(
        `SELECT * FROM agent_memories WHERE agent_id = $1 AND is_archived = false ORDER BY created_at DESC LIMIT $2`,
        [agent.id, limit]
      );
      for (const m of memResult.rows) {
        nodes.push({ type: 'memory', id: m.id, label: m.title, data: m });
        edges.push({ id: `fk-${agent.id}-${m.id}`, fromType: 'agent', fromId: agent.id, toType: 'memory', toId: m.id, relationType: 'created', weight: 1.0, metadata: {} });
      }

      const memIds = memResult.rows.map(r => r.id);
      if (memIds.length > 0) {
        const edgeResult = await pool.query(
          `SELECT * FROM memory_edges WHERE from_memory_id = ANY($1) OR to_memory_id = ANY($1)`,
          [memIds]
        );
        for (const e of edgeResult.rows) {
          if (memIds.includes(e.from_memory_id) && memIds.includes(e.to_memory_id)) {
            edges.push({
              id: e.id, fromType: 'memory', fromId: e.from_memory_id,
              toType: 'memory', toId: e.to_memory_id,
              relationType: e.relation_type, weight: parseFloat(e.weight), metadata: e.metadata || {},
            });
          }
        }
      }

      return withCORS(NextResponse.json({ nodes, edges, source: 'live' }));
    }

    return withCORS(NextResponse.json({ error: 'Provide memoryId= or agentName= or summary=1' }, { status: 400 }));
  } catch (err) {
    console.warn('[api/runtime-graph] DB unavailable, returning mock:', (err as Error).message);
    return withCORS(NextResponse.json({
      nodes: [
        { type: 'memory', id: 'mock-001', label: 'Five Iron Laws', data: { memory_type: 'governance' } },
        { type: 'agent', id: 'mock-agent-1', label: 'qclaw', data: { agent_type: 'system' } },
      ],
      edges: [
        { id: 'edge-1', fromType: 'agent', fromId: 'mock-agent-1', toType: 'memory', toId: 'mock-001', relationType: 'created', weight: 1.0, metadata: {} },
      ],
      source: 'mock',
    }));
  }
}

export async function POST() { return withCORS(new NextResponse('Method Not Allowed', { status: 405 })); }
export async function PUT() { return withCORS(new NextResponse('Method Not Allowed', { status: 405 })); }
export async function DELETE() { return withCORS(new NextResponse('Method Not Allowed', { status: 405 })); }
export async function OPTIONS() { return withCORS(new NextResponse(null, { status: 204 })); }
