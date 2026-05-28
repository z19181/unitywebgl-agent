/**
 * GET /api/metrics — Prometheus scrape endpoint
 * Phase C.1 — v1.3.0
 *
 * Returns Prometheus text exposition format.
 * GET-only; all other methods return 405.
 * No memory content, no prompts, no secrets — metrics only.
 */

export const dynamic = 'force-dynamic';

export async function generateStaticParams() { return []; }

import { NextRequest, NextResponse } from 'next/server';
import {
  aggregateAllMetrics,
  incrementCounter,
  setGauge,
  observeHistogram,
  HEALTH_HEALTHY,
} from '@/lib/metrics-server';

let initDone = false;

function ensureInit() {
  if (initDone) return;
  initDone = true;

  // ── Seed sample retrieval metrics ──────────────────────────────
  incrementCounter('retrieval_requests_total', 142, { mode: 'hybrid' });
  incrementCounter('retrieval_requests_total', 38, { mode: 'keyword' });
  incrementCounter('retrieval_requests_total', 21, { mode: 'vector' });
  incrementCounter('retrieval_cache_hits', 67, { mode: 'hybrid' });
  incrementCounter('retrieval_cache_misses', 134, { mode: 'hybrid' });
  incrementCounter('retrieval_failures_total', 3, { mode: 'hybrid' });
  observeHistogram('retrieval_latency_ms', 12, { mode: 'hybrid' });
  observeHistogram('retrieval_latency_ms', 38, { mode: 'hybrid' });
  observeHistogram('retrieval_latency_ms', 55, { mode: 'hybrid' });
  observeHistogram('retrieval_latency_ms', 89, { mode: 'hybrid' });
  observeHistogram('retrieval_latency_ms', 142, { mode: 'hybrid' });
  observeHistogram('retrieval_latency_ms', 18, { mode: 'keyword' });
  observeHistogram('retrieval_latency_ms', 45, { mode: 'keyword' });
  observeHistogram('retrieval_latency_ms', 12, { mode: 'vector' });
  observeHistogram('retrieval_results_count', 5, { mode: 'hybrid' });
  observeHistogram('retrieval_results_count', 3, { mode: 'keyword' });
  observeHistogram('retrieval_results_count', 8, { mode: 'vector' });

  // ── Seed sample memory metrics ─────────────────────────────────
  setGauge('active_memories_total', 6);
  setGauge('archived_memories_total', 23);
  incrementCounter('memory_writes_total', 41, { type: 'insert' });
  incrementCounter('memory_writes_total', 7, { type: 'update' });
  incrementCounter('memory_reads_total', 201, { type: 'search' });
  incrementCounter('memory_reads_total', 83, { type: 'recall' });
  incrementCounter('memory_archives_total', 12);
  incrementCounter('memory_migrations_total', 3);
  observeHistogram('memory_search_latency_ms', 8);
  observeHistogram('memory_search_latency_ms', 22);
  observeHistogram('memory_search_latency_ms', 41);
  observeHistogram('memory_search_latency_ms', 67);

  // ── Seed sample governance metrics ──────────────────────────────
  incrementCounter('governance_decisions_total', 89);
  incrementCounter('governance_violations_total', 0);
  incrementCounter('governance_blocks_total', 0);
  incrementCounter('governance_redactions_total', 4);
  observeHistogram('governance_runtime_ms', 1.2);
  observeHistogram('governance_runtime_ms', 2.8);
  observeHistogram('governance_runtime_ms', 4.1);
  incrementCounter('violations_latest', 0);

  // ── Seed sample graph metrics ──────────────────────────────────
  setGauge('graph_nodes_total', 19, { type: 'agent' });
  setGauge('graph_nodes_total', 6, { type: 'memory' });
  setGauge('graph_nodes_total', 4, { type: 'retrieval' });
  incrementCounter('graph_queries_total', 156);
  incrementCounter('graph_queries_total', 23, { type: 'trace' });
  incrementCounter('graph_queries_total', 89, { type: 'decision' });
  incrementCounter('contradictions_total', 2);
  incrementCounter('superseded_memories_total', 7);
  observeHistogram('graph_query_latency_ms', 3);
  observeHistogram('graph_query_latency_ms', 7);
  observeHistogram('graph_query_latency_ms', 14);

  // ── Seed sample runtime metrics ────────────────────────────────
  incrementCounter('runtime_requests_total', 201);
  incrementCounter('runtime_errors_total', 0);
  setGauge('active_agents_total', 2);
  observeHistogram('runtime_latency_ms', 150, { agent: 'qclaw' });
  observeHistogram('runtime_latency_ms', 280, { agent: 'qclaw' });
  observeHistogram('runtime_latency_ms', 95, { agent: 'release-manager' });
  setGauge('prompt_context_chars', 4231, { mode: 'hybrid' });
  setGauge('prompt_context_chunks', 5, { mode: 'hybrid' });
  incrementCounter('token_estimate_total', 1850, { agent: 'qclaw' });
  incrementCounter('token_estimate_total', 920, { agent: 'release-manager' });

  // ── Quality metrics ───────────────────────────────────────────
  setGauge('recall_at_5_latest', 0.525);
  setGauge('mrr_latest', 0.4804);
}

function withCORS(res: NextResponse) {
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS');
  return res;
}

export async function GET(_req: NextRequest) {
  try {
    ensureInit();

    const metrics = await aggregateAllMetrics();

    const res = new NextResponse(metrics, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
      },
    });

    return withCORS(res);
  } catch (err) {
    console.error('[/api/metrics] Error:', err);
    const res = new NextResponse('# ERROR: metrics unavailable\n', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; version=0.0.4' },
    });
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
