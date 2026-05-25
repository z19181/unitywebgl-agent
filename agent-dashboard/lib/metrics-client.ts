/**
 * metrics-client.ts
 * Unified adapter: Prometheus (real) with mock fallback.
 * No errors surface to the UI when Prometheus is unreachable.
 */

const PROMETHEUS_URL =
  process.env.NEXT_PUBLIC_PROMETHEUS_URL || 'http://localhost:9090';

const METRICS_MODE =
  process.env.NEXT_PUBLIC_METRICS_MODE || 'mock'; // 'mock' | 'prometheus'

let _prometheusReachable: boolean | null = null;
let _prometheusCheckTs = 0;
const CACHE_TTL = 30_000; // 30s

async function isPrometheusReachable(): Promise<boolean> {
  const now = Date.now();
  if (_prometheusReachable !== null && now - _prometheusCheckTs < CACHE_TTL) {
    return _prometheusReachable;
  }

  // Only probe if mode allows it
  if (METRICS_MODE !== 'prometheus') {
    _prometheusReachable = false;
    _prometheusCheckTs = now;
    return false;
  }

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    const res = await fetch(`${PROMETHEUS_URL}/-/healthy`, {
      method: 'GET',
      signal: ctrl.signal as any,
    } as any);
    clearTimeout(timer);
    _prometheusReachable = res.ok;
  } catch {
    _prometheusReachable = false;
  }
  _prometheusCheckTs = now;
  return _prometheusReachable;
}

// ── Prometheus query helpers ────────────────────────────────────────────────────

async function queryPrometheus(query: string): Promise<number | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const url = `${PROMETHEUS_URL}/api/v1/query?query=${encodeURIComponent(query)}`;
    const res = await fetch(url, { signal: ctrl.signal as any } as any);
    clearTimeout(timer);
    const json = await res.json();
    const result = json?.data?.result?.[0]?.value?.[1];
    return result != null ? Number(result) : null;
  } catch {
    return null;
  }
}

async function queryPrometheusSeries(query: string): Promise<any[]> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const url = `${PROMETHEUS_URL}/api/v1/query?query=${encodeURIComponent(query)}`;
    const res = await fetch(url, { signal: ctrl.signal as any } as any);
    clearTimeout(timer);
    const json = await res.json();
    return json?.data?.result || [];
  } catch {
    return [];
  }
}

// ── Agent metrics (from Prometheus) ───────────────────────────────────────────

export interface AgentStatus {
  name: string;
  type: 'orchestrator' | 'build' | 'test' | 'release' | 'memory' | 'diagnostic' | 'observability' | 'runtime';
  status: 'online' | 'idle' | 'busy' | 'error';
  lastRun?: string;
  tasks: number;
  failures: number;
  version: string;
}

export async function getAgents(): Promise<AgentStatus[]> {
  if (METRICS_MODE === 'prometheus' && await isPrometheusReachable()) {
    // Try to fetch real agent heartbeats from Prometheus
    // Metric: agent_heartbeat_timestamp{agent="<name>"}
    // For now, return mock with a flag — real integration in v1.1.4
    // (Prometheus scrapes /metrics, not the other way around for agent status)
  }
  // Always fallback to mock for v1.1.3
  const { getAgents: getMock } = await import('./api/agents');
  return getMock();
}

// ── Cost metrics ──────────────────────────────────────────────────────────────

export interface CostMetrics {
  timestamp: string;
  tokensTotal: number;
  costTotal: number;
  avgLatencyMs: number;
  cacheHitRate: number;
  tokensByModel: Record<string, number>;
  costByModel: Record<string, number>;
  history: { time: string; tokens: number; cost: number }[];
}

export async function getCostMetrics(): Promise<CostMetrics> {
  if (METRICS_MODE === 'prometheus' && await isPrometheusReachable()) {
    const [tokens, cost, latency, cacheHit] = await Promise.all([
      queryPrometheus('sum(agent_tokens_total)'),
      queryPrometheus('sum(agent_cost_total)'),
      queryPrometheus('avg(agent_latency_ms)'),
      queryPrometheus('avg(agent_cache_hit_rate)'),
    ]);
    if (tokens !== null || cost !== null) {
      return {
        timestamp: new Date().toISOString(),
        tokensTotal: tokens ?? 0,
        costTotal: cost ?? 0,
        avgLatencyMs: latency ?? 0,
        cacheHitRate: cacheHit ?? 0,
        tokensByModel: {},
        costByModel: {},
        history: [],
      };
    }
  }
  const { getCostMetrics: getMock } = await import('./api/cost');
  return getMock();
}

// ── Runtime failures ─────────────────────────────────────────────────────────

export interface RuntimeFailure {
  code: string;
  category: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  count: number;
  lastSeen: string;
  status: 'resolved' | 'active' | 'investigating';
  recoveryPlan: string[];
}

export interface FailureTrend {
  date: string;
  critical: number;
  high: number;
  medium: number;
}

export async function getRuntimeFailures(): Promise<RuntimeFailure[]> {
  // v1.1.3: still mock; real integration in v1.1.4
  const { getRuntimeFailures: getMock } = await import('./api/runtime');
  return getMock();
}

export async function getFailureTrends(): Promise<FailureTrend[]> {
  const { getFailureTrends: getMock } = await import('./api/runtime');
  return getMock();
}

// ── Builds ──────────────────────────────────────────────────────────────────

export interface Build {
  name: string;
  status: 'passed' | 'building' | 'failed' | 'queued';
  gate: string;
  lastBuild: string;
  duration: string;
  screenshots: number;
  checks: string;
}

export async function getBuilds(): Promise<Build[]> {
  const { getBuilds: getMock } = await import('./api/builds');
  return getMock();
}

// ── Release state ────────────────────────────────────────────────────────────

export interface ReleaseState {
  phase: string;
  rolloutPercent: number;
  version: string;
  commit: string;
  gates: { name: string; status: 'passed' | 'pending' | 'failed' }[];
  blockers: string[];
  rollbackReady: boolean;
}

export async function getReleaseState(): Promise<ReleaseState> {
  const { getReleaseState: getMock } = await import('./api/builds');
  return getMock();
}

// ── RAG queries ──────────────────────────────────────────────────────

export interface RAGQuery {
  id: string;
  query: string;
  category: string;
  results: number;
  topDoc: string;
  relevance: number;
  timestamp: string;
}

export interface RAGCategory {
  name: string;
  count: number;
  color: string;
}

export async function getRAGQueries(): Promise<RAGQuery[]> {
  const { getRAGQueries: getMock } = await import('./api/rag');
  return getMock();
}

export async function getRAGCategories(): Promise<RAGCategory[]> {
  const { getRAGCategories: getMock } = await import('./api/rag');
  return getMock();
}

// ── Health / status ─────────────────────────────────────────────────────────

export interface DashboardHealth {
  dashboardRuntime: 'ok';
  metricsSource: 'mock' | 'prometheus';
  prometheusReachable: boolean;
  prometheusUrl: string;
  metricsMode: string;
  timestamp: string;
}

export async function getDashboardHealth(): Promise<DashboardHealth> {
  const reachable = await isPrometheusReachable();
  return {
    dashboardRuntime: 'ok',
    metricsSource: METRICS_MODE === 'prometheus' && reachable ? 'prometheus' : 'mock',
    prometheusReachable: reachable,
    prometheusUrl: PROMETHEUS_URL,
    metricsMode: METRICS_MODE,
    timestamp: new Date().toISOString(),
  };
}
