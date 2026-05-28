// ========================================
// v1.3.0 Phase B.3 — Graph Client (read-only)
// Fallback: mock data if DB unavailable
// ========================================

const API_BASE = process.env.NEXT_PUBLIC_DASHBOARD_URL || '';

export interface GraphNode {
  type: string;
  id: string;
  label: string;
  data: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  fromType: string;
  fromId: string;
  toType: string;
  toId: string;
  relationType: string;
  weight: number;
}

export interface GraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
  source: 'live' | 'mock';
}

export interface GraphSummary {
  totalMemories: number;
  totalEdges: number;
  totalDecisions: number;
  topRelations: Array<{ type: string; count: number }>;
  agentFilter: string;
  archivedIncluded: boolean;
  source: 'live' | 'mock';
}

export interface RetrievalTrailItem {
  retrievalId: string;
  queryText: string;
  mode: string;
  memories: Array<{ id: string; title: string }>;
  docs: string[];
  cacheHit: boolean;
  latencyMs: number;
  createdAt: string;
}

// ──────────────────────────────────────────────────────────────
// getMemoryGraph(memoryId, depth)
// ──────────────────────────────────────────────────────────────

export async function getMemoryGraph(
  memoryId: string,
  depth: number = 2
): Promise<GraphResponse> {
  const url = `${API_BASE}/api/runtime-graph?memoryId=${encodeURIComponent(memoryId)}&depth=${depth}`;

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    return { nodes: data.nodes || [], edges: data.edges || [], source: data.source || 'live' };
  } catch (err) {
    console.warn('[graph-client] API unavailable, using mock data:', (err as Error).message);
    return getMockMemoryGraph(memoryId, depth);
  }
}

// ──────────────────────────────────────────────────────────────
// getAgentGraph(agentName, limit)
// ──────────────────────────────────────────────────────────────

export async function getAgentGraph(
  agentName: string,
  limit: number = 50
): Promise<GraphResponse> {
  const url = `${API_BASE}/api/runtime-graph?agentName=${encodeURIComponent(agentName)}&limit=${limit}`;

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    return { nodes: data.nodes || [], edges: data.edges || [], source: data.source || 'live' };
  } catch (err) {
    console.warn('[graph-client] API unavailable, using mock data:', (err as Error).message);
    return getMockAgentGraph(agentName, limit);
  }
}

// ──────────────────────────────────────────────────────────────
// getGraphSummary(agentName?)
// ──────────────────────────────────────────────────────────────

export async function getGraphSummary(
  agentName?: string
): Promise<GraphSummary> {
  const url = agentName
    ? `${API_BASE}/api/runtime-graph?summary=1&agent=${encodeURIComponent(agentName)}`
    : `${API_BASE}/api/runtime-graph?summary=1`;

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    return {
      totalMemories: data.totalMemories || 0,
      totalEdges: data.totalEdges || 0,
      totalDecisions: data.totalDecisions || 0,
      topRelations: data.topRelations || [],
      agentFilter: data.agentFilter || 'all',
      archivedIncluded: data.archivedIncluded || false,
      source: data.source || 'live',
    };
  } catch (err) {
    console.warn('[graph-client] API unavailable, using mock data:', (err as Error).message);
    return getMockGraphSummary(agentName);
  }
}

// ──────────────────────────────────────────────────────────────
// getRetrievalTrail(queryHash)
// ──────────────────────────────────────────────────────────────

export async function getRetrievalTrail(
  queryHash: string
): Promise<{ trail: RetrievalTrailItem[]; source: 'live' | 'mock' }> {
  const url = `${API_BASE}/api/retrieval-history?hash=${encodeURIComponent(queryHash)}`;

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    return { trail: data.trail || [], source: data.source || 'live' };
  } catch (err) {
    console.warn('[graph-client] API unavailable, using mock data:', (err as Error).message);
    return { trail: getMockRetrievalTrail(), source: 'mock' };
  }
}

// ──────────────────────────────────────────────────────────────
// getRetrievalHistory(limit)
// ──────────────────────────────────────────────────────────────

export async function getRetrievalHistory(
  limit: number = 50
): Promise<{ entries: RetrievalTrailItem[]; source: 'live' | 'mock' }> {
  const url = `${API_BASE}/api/retrieval-history?limit=${limit}`;

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    return { entries: data.entries || [], source: data.source || 'live' };
  } catch (err) {
    console.warn('[graph-client] API unavailable, using mock data:', (err as Error).message);
    return { entries: getMockRetrievalTrail(), source: 'mock' };
  }
}

// ──────────────────────────────────────────────────────────────
// getGovernanceAudit(agentName?, limit)
// ──────────────────────────────────────────────────────────────

export interface GovernanceAuditEntry {
  id: string;
  agentName: string;
  agentType: string;
  ruleName: string;
  action: string;
  decision: string;
  evidence: Record<string, unknown>;
  createdAt: string;
}

export async function getGovernanceAudit(
  agentName?: string,
  limit: number = 50
): Promise<{ entries: GovernanceAuditEntry[]; source: 'live' | 'mock' }> {
  const params = new URLSearchParams();
  if (agentName) params.set('agent', agentName);
  params.set('limit', String(limit));
  const url = `${API_BASE}/api/governance-audit?${params.toString()}`;

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    return { entries: data.entries || [], source: data.source || 'live' };
  } catch (err) {
    console.warn('[graph-client] API unavailable, using mock data:', (err as Error).message);
    return { entries: getMockGovernanceAudit(), source: 'mock' };
  }
}

// ──────────────────────────────────────────────────────────────
// Mock data factories
// ──────────────────────────────────────────────────────────────

function getMockMemoryGraph(memoryId: string, _depth: number): GraphResponse {
  return {
    nodes: [
      { type: 'memory', id: memoryId, label: 'Sample Memory', data: { title: 'Sample Memory', memory_type: 'semantic' } },
      { type: 'agent', id: 'mock-agent-1', label: 'qclaw', data: { name: 'qclaw', agent_type: 'system' } },
      { type: 'memory', id: 'mock-002', label: 'Related Memory', data: { title: 'Related Memory', memory_type: 'episodic' } },
    ],
    edges: [
      { id: 'edge-1', fromType: 'agent', fromId: 'mock-agent-1', toType: 'memory', toId: memoryId, relationType: 'created', weight: 1.0 },
      { id: 'edge-2', fromType: 'memory', fromId: memoryId, toType: 'memory', toId: 'mock-002', relationType: 'depends_on', weight: 0.8 },
    ],
    source: 'mock',
  };
}

function getMockAgentGraph(agentName: string, _limit: number): GraphResponse {
  return {
    nodes: [
      { type: 'agent', id: 'mock-agent-1', label: agentName, data: { name: agentName, agent_type: 'system' } },
      { type: 'memory', id: 'mock-001', label: 'Five Iron Laws', data: { title: 'Five Iron Laws', memory_type: 'governance' } },
      { type: 'memory', id: 'mock-002', label: 'Phase B.0 Summary', data: { title: 'Phase B.0 Summary', memory_type: 'semantic' } },
    ],
    edges: [
      { id: 'edge-1', fromType: 'agent', fromId: 'mock-agent-1', toType: 'memory', toId: 'mock-001', relationType: 'created', weight: 1.0 },
      { id: 'edge-2', fromType: 'agent', fromId: 'mock-agent-1', toType: 'memory', toId: 'mock-002', relationType: 'created', weight: 1.0 },
    ],
    source: 'mock',
  };
}

function getMockGraphSummary(agentName?: string): GraphSummary {
  return {
    totalMemories: 6,
    totalEdges: 4,
    totalDecisions: 2,
    topRelations: [
      { type: 'created', count: 2 },
      { type: 'depends_on', count: 1 },
      { type: 'supersedes', count: 1 },
    ],
    agentFilter: agentName || 'all',
    archivedIncluded: false,
    source: 'mock',
  };
}

function getMockRetrievalTrail(): RetrievalTrailItem[] {
  return [
    {
      retrievalId: 'mock-ret-1',
      queryText: 'What are the Five Iron Laws?',
      mode: 'hybrid',
      memories: [{ id: 'mock-001', title: 'Five Iron Laws' }],
      docs: ['docs/BASELINE.md'],
      cacheHit: false,
      latencyMs: 42,
      createdAt: new Date().toISOString(),
    },
  ];
}

function getMockGovernanceAudit(): GovernanceAuditEntry[] {
  return [
    {
      id: 'mock-gov-1',
      agentName: 'qclaw',
      agentType: 'system',
      ruleName: 'five_iron_laws',
      action: 'enforce',
      decision: 'allow',
      evidence: { violations: 0 },
      createdAt: new Date().toISOString(),
    },
  ];
}
