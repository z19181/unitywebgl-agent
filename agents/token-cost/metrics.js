#!/usr/bin/env node

/**
 * Token Cost Agent — metrics.js
 * v1.1.1
 *
 * Tracks agent token usage and exports Prometheus metrics.
 * In-memory store; resets on process restart.
 *
 * Usage: require('./agents/token-cost/metrics') in server/metrics/index.js
 */

const MODELS = {
  'deepseek-v4-pro': { input: 2.50, output: 8.00 },
  'claude-sonnet-4-20250514': { input: 3.00, output: 15.00 },
  'gpt-4o': { input: 2.50, output: 10.00 },
  default: { input: 2.50, output: 8.00 },
};

class TokenCostMetrics {
  constructor() {
    this.turns = [];
  }

  /**
   * Record a completed agent turn.
   */
  recordTurn({ model, inputTokens, outputTokens, latencyMs, cacheHit }) {
    const pricing = MODELS[model] || MODELS.default;
    const cost = (inputTokens / 1_000_000) * pricing.input +
                 (outputTokens / 1_000_000) * pricing.output;

    const turn = {
      timestamp: Date.now(),
      model,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      latencyMs,
      cacheHit: !!cacheHit,
      cost,
    };

    this.turns.push(turn);

    // Keep last 1000 turns
    if (this.turns.length > 1000) {
      this.turns = this.turns.slice(-1000);
    }

    return cost;
  }

  /**
   * Get aggregate stats.
   */
  getStats() {
    const turns = this.turns;
    if (turns.length === 0) return null;

    const totalTokens = turns.reduce((s, t) => s + t.totalTokens, 0);
    const totalCost = turns.reduce((s, t) => s + t.cost, 0);
    const avgLatency = turns.reduce((s, t) => s + t.latencyMs, 0) / turns.length;
    const cacheHits = turns.filter(t => t.cacheHit).length;
    const cacheHitRate = turns.length > 0 ? cacheHits / turns.length : 0;

    return { turns: turns.length, totalTokens, totalCost, avgLatency, cacheHitRate };
  }

  /**
   * Export Prometheus-format metrics.
   */
  prometheusText() {
    const stats = this.getStats();
    const lines = [];

    if (stats) {
      lines.push(`# HELP agent_tokens_total Total tokens across all agent turns`);
      lines.push(`# TYPE agent_tokens_total counter`);
      lines.push(`agent_tokens_total ${stats.totalTokens}`);

      lines.push(`# HELP agent_cost_total Estimated USD cost`);
      lines.push(`# TYPE agent_cost_total counter`);
      lines.push(`agent_cost_total ${stats.totalCost.toFixed(6)}`);

      lines.push(`# HELP agent_latency_ms Average latency per turn`);
      lines.push(`# TYPE agent_latency_ms gauge`);
      lines.push(`agent_latency_ms ${stats.avgLatency.toFixed(1)}`);

      lines.push(`# HELP agent_cache_hit_rate LCM cache hit rate`);
      lines.push(`# TYPE agent_cache_hit_rate gauge`);
      lines.push(`agent_cache_hit_rate ${stats.cacheHitRate.toFixed(4)}`);

      lines.push(`# HELP agent_turns_total Total agent turns recorded`);
      lines.push(`# TYPE agent_turns_total counter`);
      lines.push(`agent_turns_total ${stats.turns}`);
    }

    return lines.join('\n');
  }
}

// Singleton
const metrics = new TokenCostMetrics();
module.exports = metrics;
