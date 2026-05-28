// ========================================
// GET /api/agents/[name] — agent detail (read-only)
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

export async function generateStaticParams() {
  return [{ name: 'qclaw' }, { name: 'release-manager' }];
}

export async function GET(
  req: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const name = params.name;

    // Get agent
    const agentResult = await pool.query(
      `SELECT * FROM agents WHERE name = $1`,
      [name]
    );
    if (agentResult.rows.length === 0) {
      return withCORS(NextResponse.json({ error: 'Not found' }, { status: 404 }));
    }
    const agent = agentResult.rows[0];

    // Get memories
    const memResult = await pool.query(
      `SELECT id, title, memory_type, importance, confidence, is_archived, created_at
         FROM agent_memories WHERE agent_id = $1 AND is_archived = false
         ORDER BY created_at DESC LIMIT 50`,
      [agent.id]
    );

    // Get runs
    const runResult = await pool.query(
      `SELECT id, session_key, model, started_at, ended_at, exit_reason
         FROM agent_runs WHERE agent_id = $1
         ORDER BY started_at DESC LIMIT 20`,
      [agent.id]
    );

    // Get retrieval history
    const retResult = await pool.query(
      `SELECT id, query_text, mode, latency_ms, cache_hit, created_at
         FROM retrieval_history WHERE agent_name = $1
         ORDER BY created_at DESC LIMIT 20`,
      [name]
    );

    return withCORS(NextResponse.json({
      agent: {
        id: agent.id,
        name: agent.name,
        agentType: agent.agent_type,
        description: agent.description,
        isActive: agent.is_active,
        createdAt: agent.created_at,
        updatedAt: agent.updated_at,
      },
      memories: memResult.rows.map(r => ({
        id: r.id, title: r.title, memoryType: r.memory_type,
        importance: parseFloat(r.importance), confidence: parseFloat(r.confidence),
        isArchived: r.is_archived, createdAt: r.created_at,
      })),
      runs: runResult.rows.map(r => ({
        id: r.id, sessionKey: r.session_key, model: r.model,
        startedAt: r.started_at, endedAt: r.ended_at, exitReason: r.exit_reason,
      })),
      retrievals: retResult.rows.map(r => ({
        id: r.id, queryText: r.query_text, mode: r.mode,
        latencyMs: r.latency_ms, cacheHit: r.cache_hit, createdAt: r.created_at,
      })),
      source: 'live',
    }));
  } catch (err) {
    console.warn('[api/agents/[name]] DB unavailable, returning mock:', (err as Error).message);
    return withCORS(NextResponse.json({
      agent: { id:'mock-1', name:params.name, agentType:'system', isActive:true, createdAt:new Date().toISOString() },
      memories: [
        { id:'mock-001', title:'Five Iron Laws', memoryType:'governance', importance:10, confidence:1.0, isArchived:false, createdAt:new Date().toISOString() },
      ],
      runs: [],
      retrievals: [],
      source: 'mock',
    }));
  }
}

export async function POST() { return withCORS(new NextResponse('Method Not Allowed', { status: 405 })); }
export async function PUT() { return withCORS(new NextResponse('Method Not Allowed', { status: 405 })); }
export async function DELETE() { return withCORS(new NextResponse('Method Not Allowed', { status: 405 })); }
export async function OPTIONS() { return withCORS(new NextResponse(null, { status: 204 })); }
