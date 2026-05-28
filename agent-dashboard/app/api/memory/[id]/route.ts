// ========================================
// GET /api/memory/[id] — memory detail (read-only)
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
  return [{ id: 'mem-001' }];
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Get memory
    const memResult = await pool.query(
      `SELECT * FROM agent_memories WHERE id = $1`,
      [id]
    );
    if (memResult.rows.length === 0) {
      return withCORS(NextResponse.json({ error: 'Not found' }, { status: 404 }));
    }
    const memory = memResult.rows[0];

    // Get edges from memory_edges
    const edgeResult = await pool.query(
      `SELECT * FROM memory_edges WHERE from_memory_id = $1 OR to_memory_id = $1`,
      [id]
    );

    // Get related memories
    const relatedResult = await pool.query(
      `SELECT me.relation_type, m.id, m.title
         FROM memory_edges me
         JOIN agent_memories m ON m.id = CASE
           WHEN me.from_memory_id = $1 THEN me.to_memory_id
           ELSE me.from_memory_id
         END
        WHERE me.from_memory_id = $1 OR me.to_memory_id = $1`,
      [id]
    );

    return withCORS(NextResponse.json({
      memory: {
        id: memory.id,
        agentName: memory.agent_name,
        agentId: memory.agent_id,
        memoryType: memory.memory_type,
        title: memory.title,
        content: memory.content,
        source: memory.source,
        importance: parseFloat(memory.importance),
        confidence: parseFloat(memory.confidence),
        tags: memory.tags || [],
        metadata: memory.metadata || {},
        isArchived: memory.is_archived,
        createdAt: memory.created_at,
        updatedAt: memory.updated_at,
        archivedAt: memory.archived_at,
      },
      edges: edgeResult.rows.map(r => ({
        id: r.id,
        fromType: 'memory',
        fromId: r.from_memory_id,
        toType: 'memory',
        toId: r.to_memory_id,
        relationType: r.relation_type,
        weight: parseFloat(r.weight),
      })),
      related: relatedResult.rows.map(r => ({
        id: r.id,
        title: r.title,
        relationType: r.relation_type,
      })),
      source: 'live',
    }));
  } catch (err) {
    console.warn('[api/memory/[id]] DB unavailable, returning mock:', (err as Error).message);
    return withCORS(NextResponse.json({
      memory: {
        id: params.id,
        agentName: 'qclaw',
        agentId: 'mock-agent-1',
        memoryType: 'semantic',
        title: 'Mock Memory',
        content: 'Mock content (DB unavailable)',
        source: 'mock',
        importance: 7,
        confidence: 0.8,
        tags: ['mock'],
        metadata: {},
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        archivedAt: null,
      },
      edges: [],
      related: [],
      source: 'mock',
    }));
  }
}

export async function POST() { return withCORS(new NextResponse('Method Not Allowed', { status: 405 })); }
export async function PUT() { return withCORS(new NextResponse('Method Not Allowed', { status: 405 })); }
export async function DELETE() { return withCORS(new NextResponse('Method Not Allowed', { status: 405 })); }
export async function OPTIONS() {
  return withCORS(new NextResponse(null, { status: 204 }));
}
