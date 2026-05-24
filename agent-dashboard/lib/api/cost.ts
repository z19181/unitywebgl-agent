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

export function getCostMetrics(): CostMetrics {
  return {
    timestamp: new Date().toISOString(),
    tokensTotal: 245830,
    costTotal: 1.847,
    avgLatencyMs: 3420,
    cacheHitRate: 0.62,
    tokensByModel: {
      'deepseek-v4-pro': 198400,
      'claude-sonnet-4': 42300,
      'gpt-4o': 5130,
    },
    costByModel: {
      'deepseek-v4-pro': 1.24,
      'claude-sonnet-4': 0.51,
      'gpt-4o': 0.097,
    },
    history: [
      { time: '00:00', tokens: 8200, cost: 0.06 },
      { time: '04:00', tokens: 4500, cost: 0.03 },
      { time: '08:00', tokens: 15200, cost: 0.12 },
      { time: '12:00', tokens: 28400, cost: 0.22 },
      { time: '16:00', tokens: 31200, cost: 0.25 },
      { time: '20:00', tokens: 18900, cost: 0.15 },
    ],
  };
}
