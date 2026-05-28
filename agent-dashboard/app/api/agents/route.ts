// ========================================
// GET /api/agents — list agents (read-only)
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

export async function GET(_req: NextRequest) {
  try {
    const result = await pool.query(
      `SELECT a.*,
              (SELECT COUNT(*) FROM agent_memories m WHERE m.agent_id = a.id AND m.is_archived = false) as memory_count,
              (SELECT COUNT(*) FROM agent_runs r WHERE r.agent_id = a.id) as run_count,
              (SELECT MAX(created_at) FROM agent_runs r WHERE r.agent_id = a.id) as last_run
         FROM agents a
        ORDER BY a.created_at DESC`
    );

    const agents = result.rows.map(r => ({
      id: r.id,
      name: r.name,
      agentType: r.agent_type,
      description: r.description,
      isActive: r.is_active,
      memoryCount: parseInt(r.memory_count) || 0,
      runCount: parseInt(r.run_count) || 0,
      lastRun: r.last_run,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    return withCORS(NextResponse.json({ agents, source: 'live' }));
  } catch (err) {
    console.warn('[api/agents] DB unavailable, returning mock:', (err as Error).message);
    return withCORS(NextResponse.json({
      agents: [
        { id:'mock-1', name:'qclaw', agentType:'system', description:'Main QClaw agent', isActive:true, memoryCount:6, runCount:12, lastRun:new Date().toISOString(), createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() },
        { id:'mock-2', name:'release-manager', agentType:'release', description:'Release gate agent', isActive:true, memoryCount:3, runCount:5, lastRun:new Date().toISOString(), createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() },
      ],
      source: 'mock',
    }));
  }
}

export async function POST() { return withCORS(new NextResponse('Method Not Allowed', { status: 405 })); }
export async function PUT() { return withCORS(new NextResponse('Method Not Allowed', { status: 405 })); }
export async function DELETE() { return withCORS(new NextResponse('Method Not Allowed', { status: 405 })); }
export async function OPTIONS() { return withCORS(new NextResponse(null, { status: 204 })); }
