export interface Build {
  name: string;
  status: 'passed' | 'building' | 'failed' | 'queued';
  gate: string;
  lastBuild: string;
  duration: string;
  screenshots: number;
  checks: string;
}

export function getBuilds(): Build[] {
  return [
    { name: 'JumpJump', status: 'passed', gate: 'ALL CLEAR', lastBuild: '2h ago', duration: '4m 32s', screenshots: 3, checks: '26/26' },
    { name: 'CurrentScene', status: 'passed', gate: 'ALL CLEAR', lastBuild: '4h ago', duration: '3m 18s', screenshots: 2, checks: '26/26' },
    { name: 'Snake', status: 'passed', gate: 'ALL CLEAR', lastBuild: '2d ago', duration: '5m 11s', screenshots: 4, checks: '26/26' },
    { name: '2048', status: 'passed', gate: 'ALL CLEAR', lastBuild: '3d ago', duration: '4m 48s', screenshots: 3, checks: '26/26' },
    { name: 'Breakout', status: 'passed', gate: 'ALL CLEAR', lastBuild: '3d ago', duration: '5m 02s', screenshots: 3, checks: '26/26' },
    { name: 'Flappy Bird', status: 'passed', gate: 'ALL CLEAR', lastBuild: '4d ago', duration: '3m 55s', screenshots: 4, checks: '26/26' },
  ];
}

export interface ReleaseState {
  phase: string;
  rolloutPercent: number;
  version: string;
  commit: string;
  gates: { name: string; status: 'passed' | 'pending' | 'failed' }[];
  blockers: string[];
  rollbackReady: boolean;
}

export function getReleaseState(): ReleaseState {
  return {
    phase: 'production_release_candidate',
    rolloutPercent: 100,
    version: 'v0.4.2',
    commit: '9832c92',
    gates: [
      { name: 'Phase 1 QA', status: 'passed' },
      { name: 'Phase 2 Canary 1%', status: 'passed' },
      { name: 'Phase 3 Canary 10%', status: 'passed' },
      { name: 'Phase 4 Canary 50%', status: 'passed' },
      { name: 'Phase 5 Prod Candidate', status: 'passed' },
      { name: 'Runtime Gate', status: 'passed' },
      { name: 'Runtime Automation', status: 'passed' },
    ],
    blockers: [],
    rollbackReady: true,
  };
}
