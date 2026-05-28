// ========================================
// GET /api/memory — list memories (read-only)
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
    const agent = searchParams.get('agent');
    const type = searchParams.get('type');
    const archived = searchParams.get('archived') === 'true';
    const search = searchParams.get('search') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);

    let sql = `SELECT id, agent_name, memory_type, title,
                      importance, confidence, tags, is_archived,
                      created_at, updated_at
                 FROM agent_memories
                WHERE 1=1`;
    const params: unknown[] = [];
    let idx = 1;

    if (!archived) { sql += ` AND is_archived = false`; }
    if (agent) { sql += ` AND agent_name = $${idx++}`; params.push(agent); }
    if (type) { sql += ` AND memory_type = $${idx++}`; params.push(type); }
    if (search) {
      sql += ` AND (to_tsvector('english', title || ' ' || content) @> plainto_tsquery('english', $${idx++})`;
      params.push(search);
    }

    sql += ` ORDER BY created_at DESC LIMIT $${idx++}`;
    params.push(limit);

    const result = await pool.query(sql, params);

    const memories = result.rows.map(r => ({
      id: r.id, agentName: r.agent_name, memoryType: r.memory_type,
      title: r.title, importance: parseFloat(r.importance),
      confidence: parseFloat(r.confidence), tags: r.tags || [],
      isArchived: r.is_archived, createdAt: r.created_at, updatedAt: r.updated_at,
    }));

    return withCORS(NextResponse.json({ memories, total: memories.length, source: 'live' }));
  } catch (err) {
    console.warn('[api/memory] DB unavailable, returning mock:', (err as Error).message);
    return withCORS(NextResponse.json({
      memories: [
        { id:'mock-001', agentName:'qclaw', memoryType:'governance', title:'Five Iron Laws',
          importance:10, confidence:1.0, tags:['governance'], isArchived:false,
          createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() },
        { id:'mock-002', agentName:'qclaw', memoryType:'semantic', title:'Phase B.0 Summary',
          importance:8, confidence:0.95, tags:['phase-b'], isArchived:false,
          createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() },
      ],
      total: 2, source: 'mock',
    }));
  }
}

export async function POST() { return withCORS(new NextResponse('Method Not Allowed', { status: 405 })); }
export async function PUT() { return withCORS(new NextResponse('Method Not Allowed', { status: 405 })); }
export async function DELETE() { return withCORS(new NextResponse('Method Not Allowed', { status: 405 })); }
export async function OPTIONS() {
  return withCORS(new NextResponse(null, { status: 204 }));
}
