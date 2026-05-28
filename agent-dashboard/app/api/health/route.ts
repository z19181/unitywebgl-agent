/**
 * GET /api/health — Runtime Health Check endpoint
 * Phase C.4 — v1.3.0
 *
 * Returns JSON health status for all subsystems.
 * GET-only; all other methods return 405.
 * No secrets, no memory content, no prompt content.
 *
 * Health logic lives in lib/health.js (webpack-resolvable).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSystemHealth } from '@/lib/health';

function sanitize(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    if (/sk-|bearer|ghp_|github_pat_|xoxb-|password=|postgres:\/\/[^@]+@/i.test(obj)) {
      return '(redacted)';
    }
    return obj;
  }
  if (typeof obj === 'number' || typeof obj === 'boolean') return obj;
  if (Array.isArray(obj)) return obj.map(sanitize);
  if (typeof obj === 'object') {
    const out: any = {};
    for (const k in obj) {
      if (/secret|password|token|key|auth/i.test(k)) {
        out[k] = '(redacted)';
      } else {
        out[k] = sanitize(obj[k]);
      }
    }
    return out;
  }
  return obj;
}

function withCORS(res: NextResponse) {
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS');
  return res;
}

export async function GET(_req: NextRequest) {
  try {
    const health = await getSystemHealth();
    const safe      = sanitize(health);
    const httpStatus = safe.status === 'critical' ? 503 : 200;

    const res = new NextResponse(JSON.stringify(safe, null, 2), {
      status: httpStatus,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
      },
    });
    return withCORS(res);
  } catch (err: any) {
    console.error('[/api/health] Error:', err?.message);
    const res = new NextResponse(
      JSON.stringify({
        status:    'critical',
        timestamp: new Date().toISOString(),
        error:     (err?.message || String(err)),
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
    return withCORS(res);
  }
}

export async function POST() {
  return withCORS(new NextResponse('Method Not Allowed', { status: 405 }));
}
export async function PUT() {
  return withCORS(new NextResponse('Method Not Allowed', { status: 405 }));
}
export async function DELETE() {
  return withCORS(new NextResponse('Method Not Allowed', { status: 405 }));
}
export async function OPTIONS() {
  return withCORS(new NextResponse(null, { status: 204 }));
}
