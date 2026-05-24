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

export function getRuntimeFailures(): RuntimeFailure[] {
  return [
    { code: 'RTE-004', category: 'Black screen', severity: 'CRITICAL', count: 2, lastSeen: '2026-05-24', status: 'resolved', recoveryPlan: ['Replace HDRP with URP Simple Lit', 'Verify camera active', 'Rebuild and retest'] },
    { code: 'RTE-001', category: 'Loader fail', severity: 'CRITICAL', count: 1, lastSeen: '2026-05-24', status: 'resolved', recoveryPlan: ['Fix loaderUrl path', 'Verify nginx serving', 'Rebuild Docker'] },
    { code: 'RTE-005', category: 'WebSocket fail', severity: 'HIGH', count: 0, lastSeen: '—', status: 'resolved', recoveryPlan: ['Check docker compose', 'Verify protocol auto-detect', 'Test /__health'] },
    { code: 'RTE-002', category: 'Wasm fail', severity: 'CRITICAL', count: 0, lastSeen: '—', status: 'resolved', recoveryPlan: ['Verify .wasm path', 'Check file size', 'Enable Brotli'] },
    { code: 'RTE-006', category: 'Controller desync', severity: 'HIGH', count: 0, lastSeen: '—', status: 'resolved', recoveryPlan: ['Check state_update handler', 'Verify forwardToUnity', 'Check playerIndex'] },
    { code: 'RTE-008', category: 'State broadcast fail', severity: 'HIGH', count: 0, lastSeen: '—', status: 'resolved', recoveryPlan: ['Verify PartyGameBridge.jslib', 'Check server relay', 'Check WS alive'] },
  ];
}

export function getFailureTrends(): FailureTrend[] {
  return [
    { date: '05-20', critical: 2, high: 3, medium: 1 },
    { date: '05-21', critical: 3, high: 2, medium: 0 },
    { date: '05-22', critical: 1, high: 4, medium: 2 },
    { date: '05-23', critical: 2, high: 1, medium: 1 },
    { date: '05-24', critical: 0, high: 0, medium: 0 },
  ];
}
