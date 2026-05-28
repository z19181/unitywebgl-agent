// Mock data adapters for Agent Dashboard v1.1.2
// Replace with real Prometheus/GitHub API in v1.1.3

export interface AgentStatus {
  name: string;
  type: 'orchestrator' | 'build' | 'test' | 'release' | 'memory' | 'diagnostic' | 'observability' | 'runtime';
  status: 'online' | 'idle' | 'busy' | 'error';
  lastRun?: string;
  tasks: number;
  failures: number;
  version: string;
}

export function getAgents(): AgentStatus[] {
  return [
    { name: 'QClaw', type: 'orchestrator', status: 'online', lastRun: '2m ago', tasks: 24, failures: 0, version: 'v1.1.1' },
    { name: 'Codex', type: 'build', status: 'busy', lastRun: '5m ago', tasks: 8, failures: 0, version: 'v1.1.1' },
    { name: 'RAG Memory', type: 'memory', status: 'online', lastRun: '30s ago', tasks: 47, failures: 0, version: 'v1.1.1' },
    { name: 'Runtime Triage', type: 'diagnostic', status: 'idle', tasks: 3, failures: 0, version: 'v1.1.1' },
    { name: 'Token Cost', type: 'observability', status: 'online', lastRun: '1m ago', tasks: 156, failures: 0, version: 'v1.1.1' },
    { name: 'Model Router', type: 'orchestrator', status: 'online', lastRun: '10s ago', tasks: 89, failures: 0, version: 'v1.1.1' },
    { name: 'Unity Builder', type: 'build', status: 'idle', tasks: 4, failures: 1, version: 'v1.0.1' },
    { name: 'QA Verification', type: 'test', status: 'idle', tasks: 12, failures: 0, version: 'v1.0.1' },
    { name: 'Release Manager', type: 'release', status: 'online', lastRun: '1h ago', tasks: 5, failures: 0, version: 'v1.0.1' },
    { name: 'Template Factory', type: 'build', status: 'idle', tasks: 3, failures: 0, version: 'v1.0.1' },
    { name: 'Governance Auditor', type: 'release', status: 'online', lastRun: '15m ago', tasks: 22, failures: 0, version: 'v1.0.1' },
    { name: 'Screen', type: 'runtime', status: 'online', tasks: 0, failures: 0, version: 'v0.4.2' },
    { name: 'Controller', type: 'runtime', status: 'online', tasks: 0, failures: 0, version: 'v0.4.2' },
  ];
}
