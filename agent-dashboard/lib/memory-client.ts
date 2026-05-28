// ========================================
// v1.3.0 Phase B.3 — Memory Client (read-only)
// Fallback: mock data if DB unavailable
// ========================================

const API_BASE = process.env.NEXT_PUBLIC_DASHBOARD_URL || '';

export interface Memory {
  id: string;
  agentName: string;
  agentId: string;
  memoryType: string;
  title: string;
  content: string;
  source: string;
  sourceFile?: string;
  importance: number;
  confidence: number;
  tags: string[];
  metadata: Record<string, unknown>;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface MemoryListResponse {
  memories: Memory[];
  total: number;
  source: 'live' | 'mock';
}

export interface MemoryDetailResponse {
  memory: Memory;
  edges: Array<{
    id: string;
    fromType: string;
    fromId: string;
    toType: string;
    toId: string;
    relationType: string;
    weight: number;
  }>;
  related: Array<{ id: string; title: string; relationType: string }>;
  source: 'live' | 'mock';
}

// ──────────────────────────────────────────────────────────────
// getMemories(filters) → Memory[]
// ──────────────────────────────────────────────────────────────

export async function getMemories(filters: {
  agentName?: string;
  memoryType?: string;
  includeArchived?: boolean;
  search?: string;
  limit?: number;
} = {}): Promise<MemoryListResponse> {
  const params = new URLSearchParams();
  if (filters.agentName) params.set('agent', filters.agentName);
  if (filters.memoryType) params.set('type', filters.memoryType);
  if (filters.includeArchived) params.set('archived', 'true');
  if (filters.search) params.set('search', filters.search);
  if (filters.limit) params.set('limit', String(filters.limit));

  const url = `${API_BASE}/api/memory?${params.toString()}`;

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    return { memories: data.memories || [], total: data.total || 0, source: data.source || 'live' };
  } catch (err) {
    console.warn('[memory-client] API unavailable, using mock data:', (err as Error).message);
    return { memories: getMockMemories(filters), total: 6, source: 'mock' };
  }
}

// ──────────────────────────────────────────────────────────────
// getMemory(id) → Memory + edges + related
// ──────────────────────────────────────────────────────────────

export async function getMemory(id: string): Promise<MemoryDetailResponse> {
  const url = `${API_BASE}/api/memory/${encodeURIComponent(id)}`;

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    return {
      memory: data.memory,
      edges: data.edges || [],
      related: data.related || [],
      source: data.source || 'live',
    };
  } catch (err) {
    console.warn('[memory-client] API unavailable, using mock data:', (err as Error).message);
    const mock = getMockMemories({}).find(m => m.id === id) || getMockMemories({})[0];
    return {
      memory: mock,
      edges: [],
      related: [],
      source: 'mock',
    };
  }
}

// ──────────────────────────────────────────────────────────────
// Mock data (read-only, no secrets)
// ──────────────────────────────────────────────────────────────

function getMockMemories(filters: Record<string, unknown>): Memory[] {
  const now = new Date().toISOString();
  const memories: Memory[] = [
    {
      id: 'mock-001', agentName: 'qclaw', agentId: 'mock-agent-1',
      memoryType: 'governance', title: 'Five Iron Laws',
      content: '1. Controller only sends input. 2. Server injects playerIndex. 3. Screen+Unity handles logic. 4. Unity broadcasts. 5. Controller updates UI.',
      source: 'system', sourceFile: 'BASELINE.md', importance: 10, confidence: 1.0,
      tags: ['governance', 'baseline'], metadata: {}, isArchived: false,
      createdAt: now, updatedAt: now, archivedAt: null,
    },
    {
      id: 'mock-002', agentName: 'qclaw', agentId: 'mock-agent-1',
      memoryType: 'semantic', title: 'Phase B.0 Summary',
      content: 'Phase B.0 delivered minimal persistent memory store with 81/81 tests passing.',
      source: 'agent', sourceFile: undefined, importance: 8, confidence: 0.95,
      tags: ['phase-b', 'memory'], metadata: {}, isArchived: false,
      createdAt: now, updatedAt: now, archivedAt: null,
    },
    {
      id: 'mock-003', agentName: 'qclaw', agentId: 'mock-agent-1',
      memoryType: 'episodic', title: 'Debug session 2026-05-27',
      content: 'Found infinite loop in secret_scanner.js due to missing g flag on regex patterns.',
      source: 'agent', sourceFile: undefined, importance: 6, confidence: 0.9,
      tags: ['debug', 'secret-scanner'], metadata: {}, isArchived: false,
      createdAt: now, updatedAt: now, archivedAt: null,
    },
    {
      id: 'mock-004', agentName: 'release-manager', agentId: 'mock-agent-2',
      memoryType: 'procedural', title: 'Release Gate Process',
      content: 'All releases must pass baseline verification (13/13) before tag is created.',
      source: 'system', sourceFile: 'RELEASE_STATE.json', importance: 9, confidence: 1.0,
      tags: ['release', 'governance'], metadata: {}, isArchived: false,
      createdAt: now, updatedAt: now, archivedAt: null,
    },
    {
      id: 'mock-005', agentName: 'qclaw', agentId: 'mock-agent-1',
      memoryType: 'working', title: 'Temp working memory',
      content: 'This is a working memory that will be archived after 7 days.',
      source: 'agent', sourceFile: undefined, importance: 3, confidence: 0.6,
      tags: ['working', 'temp'], metadata: {}, isArchived: true,
      createdAt: now, updatedAt: now, archivedAt: now,
    },
    {
      id: 'mock-006', agentName: 'test-agent', agentId: 'mock-agent-3',
      memoryType: 'semantic', title: 'Test memory for dashboard',
      content: 'This memory tests the dashboard UI rendering.',
      source: 'agent', sourceFile: undefined, importance: 5, confidence: 0.8,
      tags: ['test', 'dashboard'], metadata: {}, isArchived: false,
      createdAt: now, updatedAt: now, archivedAt: null,
    },
  ];

  // Apply filters
  let filtered = memories;
  if (filters.agentName) filtered = filtered.filter(m => m.agentName === filters.agentName);
  if (filters.memoryType) filtered = filtered.filter(m => m.memoryType === filters.memoryType);
  if (!filters.includeArchived) filtered = filtered.filter(m => !m.isArchived);

  return filtered;
}

export function getMockMemoryDetail(id: string): MemoryDetailResponse {
  const memories = getMockMemories({});
  const memory = memories.find(m => m.id === id) || memories[0];
  return {
    memory,
    edges: [
      { id: 'edge-1', fromType: 'agent', fromId: memory.agentId, toType: 'memory', toId: memory.id, relationType: 'created', weight: 1.0 },
    ],
    related: memories.filter(m => m.id !== id).slice(0, 3).map(m => ({ id: m.id, title: m.title, relationType: 'depends_on' })),
    source: 'mock',
  };
}
