/**
 * metrics-server.ts
 * Phase C.1 — aggregates all domain metrics + health gauges
 * Pure JS, no external deps. Safe for Next.js edge/server.
 */

'use strict';

interface MetricEntry {
  name: string;
  value?: number;
  buckets?: number[];
  values?: number[];
  __labels: Record<string, any>;
  __key: string;
}

interface Registry {
  counters: Record<string, MetricEntry>;
  gauges: Record<string, MetricEntry>;
  histograms: Record<string, MetricEntry>;
}

var registry: Registry = {
  counters: {},
  gauges: {},
  histograms: {},
};

// ── Guards ─────────────────────────────────────────────────────────
var MAX_LABELS_PER_METRIC = 10;
var MAX_LABEL_VALUE_LENGTH = 128;
var MAX_METRIC_SERIES = 10000;
var MAX_HISTOGRAM_VALUES = 1000;

// ── HELP text registry ──────────────────────────────────────────────
var helpTexts: Record<string, string> = {
  system_health_status: 'System health status (2=healthy, 1=degraded, 0=critical)',
  postgres_health: 'PostgreSQL health (2=healthy, 1=degraded, 0=critical)',
  pgvector_health: 'pgvector health (2=healthy, 1=degraded, 0=critical)',
  retrieval_runtime_health: 'Retrieval runtime health (2=healthy, 1=degraded, 0=critical)',
  graph_runtime_health: 'Graph runtime health (2=healthy, 1=degraded, 0=critical)',
  cache_runtime_health: 'Cache runtime health (2=healthy, 1=degraded, 0=critical)',
  retrieval_requests_total: 'Total retrieval requests by mode',
  retrieval_latency_ms: 'Retrieval latency in milliseconds',
  retrieval_cache_hits: 'Retrieval cache hits',
  retrieval_cache_misses: 'Retrieval cache misses',
  retrieval_results_count: 'Retrieval result count',
  retrieval_failures_total: 'Total retrieval failures',
  recall_at_5_latest: 'Latest Recall@5 value',
  mrr_latest: 'Latest MRR value',
  violations_latest: 'Latest governance violations count',
  memory_writes_total: 'Total memory write operations',
  memory_reads_total: 'Total memory read operations',
  memory_archives_total: 'Total memory archive operations',
  memory_migrations_total: 'Total memory migration operations',
  memory_search_latency_ms: 'Memory search latency in milliseconds',
  active_memories_total: 'Total active (non-archived) memories',
  archived_memories_total: 'Total archived memories',
  graph_nodes_total: 'Total graph nodes',
  graph_edges_total: 'Total graph edges',
  graph_queries_total: 'Total graph queries',
  graph_query_latency_ms: 'Graph query latency in milliseconds',
  contradictions_total: 'Total contradiction edges',
  superseded_memories_total: 'Total superseded memories',
  governance_decisions_total: 'Total governance decisions',
  governance_violations_total: 'Total governance violations',
  governance_blocks_total: 'Total governance blocks',
  governance_redactions_total: 'Total redaction operations',
  governance_runtime_ms: 'Governance runtime in milliseconds',
  active_agents_total: 'Total active agents',
  runtime_errors_total: 'Total runtime errors',
  runtime_requests_total: 'Total runtime requests',
  runtime_latency_ms: 'Runtime latency in milliseconds',
  prompt_context_chars: 'Prompt context size in characters',
  prompt_context_chunks: 'Prompt context chunk count',
  token_estimate_total: 'Total estimated token count',
};

// ── Validation ───────────────────────────────────────────────────────
var VALID_METRIC_NAME = /^[a-zA-Z_:][a-zA-Z0-9_:]*$/;
var VALID_LABEL_NAME = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function validateMetricName(name: string): void {
  if (!VALID_METRIC_NAME.test(name)) throw new Error('Invalid metric name: ' + name);
}

function validateLabelCount(labels: Record<string, any>, name: string): void {
  var keys = Object.keys(labels);
  if (keys.length > MAX_LABELS_PER_METRIC) {
    throw new Error('Too many labels (' + keys.length + ' > ' + MAX_LABELS_PER_METRIC + '): ' + name);
  }
}

function countSeries(): number {
  return Object.keys(registry.counters).length +
         Object.keys(registry.gauges).length +
         Object.keys(registry.histograms).length;
}

var metricTypeMap: Record<string, string> = {};

function validateMetricType(name: string, type: string): void {
  if (metricTypeMap[name] && metricTypeMap[name] !== type) {
    throw new Error('Metric ' + name + ' already registered as ' + metricTypeMap[name] + ', cannot re-register as ' + type);
  }
  metricTypeMap[name] = type;
}

function safeCloneLabels(labels: Record<string, any>): Record<string, any> {
  if (!labels || typeof labels !== 'object') return {};
  var result: Record<string, any> = {};
  Object.keys(labels).forEach(function(k: string) {
    var v = labels[k];
    var t = typeof v;
    if (t === 'string' || t === 'number' || t === 'boolean' || v === null) {
      result[k] = v;
    } else {
      result[k] = '(redacted)';
    }
  });
  return result;
}

function sanitizeLabelKey(key: string): string {
  var s = String(key);
  if (!VALID_LABEL_NAME.test(s)) return s.replace(/[^a-zA-Z0-9_]/g, '_');
  return s;
}

var SECRET_PATTERNS = /(sk-|bearer|jwt|ghp_|github_pat_|xoxb-|xoxp-|api_key|authorization:|cookie:|session=|password=|<SECRET_REDACTED>|postgres:\/\/[^@]+@)/i;

function sanitizeLabelValue(v: any, k?: string): string {
  if (typeof v === 'string') {
    if (SECRET_PATTERNS.test(v) || (k && SECRET_PATTERNS.test(k))) return '(redacted)';
    if (v.length > MAX_LABEL_VALUE_LENGTH) v = v.substring(0, MAX_LABEL_VALUE_LENGTH) + '...';
    return v.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t').replace(/"/g, '\\"');
  }
  if (typeof v === 'number') {
    if (isNaN(v) || !isFinite(v)) return '(redacted)';
  }
  return String(v);
}

function sanitizeHelpText(text: string): string {
  if (typeof text === 'string') return text.replace(/\n/g, ' ').replace(/\r/g, '').trim();
  return String(text);
}

function fmt(v: number): string {
  if (typeof v !== 'number') return String(v);
  if (!isFinite(v) || isNaN(v)) return '(redacted)';
  return Number(v.toFixed(6)).toString();
}

function defaults(labels: Record<string, any>): Record<string, any> {
  if (!labels || typeof labels !== 'object') return {};
  return labels;
}

function sortedLabelEntries(labels: Record<string, any>): [string, any][] {
  return Object.keys(labels).sort().map(function(k) { return [k, labels[k]] as [string, any]; });
}

function labelString(labels: Record<string, any>): string {
  var entries = sortedLabelEntries(labels);
  if (entries.length === 0) return '';
  return '{' + entries.map(function(e) {
    return sanitizeLabelKey(e[0]) + '="' + sanitizeLabelValue(e[1], e[0]) + '"';
  }).join(',') + '}';
}

function metricKey(name: string, labels: Record<string, any>): string {
  labels = defaults(labels);
  var parts = [name].concat(sortedLabelEntries(labels).map(function(e) {
    return sanitizeLabelKey(e[0]) + '="' + sanitizeLabelValue(e[1], e[0]) + '"';
  }));
  return parts.join(',');
}

// ── Counters ─────────────────────────────────────────────────────────
function incrementCounter(name: string, value?: number, labels?: Record<string, any>): void {
  value = value === undefined ? 1 : value;
  labels = defaults(labels || {});
  validateMetricName(name);
  validateMetricType(name, 'counter');
  if (typeof value === 'number' && value < 0) throw new Error('Counter cannot be negative: ' + name);
  if (countSeries() >= MAX_METRIC_SERIES && !registry.counters[metricKey(name, labels)]) {
    throw new Error('Metric series limit exceeded: ' + MAX_METRIC_SERIES);
  }
  validateLabelCount(labels, name);
  var key = metricKey(name, labels);
  var entry: MetricEntry = registry.counters[key];
  if (!entry) {
    entry = { name, value: 0, __labels: safeCloneLabels(labels), __key: key };
    registry.counters[key] = entry;
  }
  entry.value = (entry.value || 0) + value;
}

// ── Gauges ───────────────────────────────────────────────────────────
function setGauge(name: string, value: number, labels?: Record<string, any>): void {
  labels = defaults(labels || {});
  validateMetricName(name);
  validateMetricType(name, 'gauge');
  if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) return;
  if (countSeries() >= MAX_METRIC_SERIES && !registry.gauges[metricKey(name, labels)]) {
    throw new Error('Metric series limit exceeded: ' + MAX_METRIC_SERIES);
  }
  validateLabelCount(labels, name);
  var key = metricKey(name, labels);
  registry.gauges[key] = { name, value, __labels: safeCloneLabels(labels), __key: key };
}

// ── Histograms ───────────────────────────────────────────────────────
var DEFAULT_BUCKETS = [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

function observeHistogram(name: string, value: number, labels?: Record<string, any>, buckets?: number[]): void {
  labels = defaults(labels || {});
  buckets = buckets || DEFAULT_BUCKETS;
  validateMetricName(name);
  validateMetricType(name, 'histogram');
  if (typeof value === 'number' && value < 0) {
    if (name.endsWith('_latency_ms') || name.endsWith('_runtime_ms')) {
      throw new Error('Histogram cannot observe negative latency: ' + name);
    }
  }
  if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) return;
  if (countSeries() >= MAX_METRIC_SERIES && !registry.histograms[metricKey(name, labels)]) {
    throw new Error('Metric series limit exceeded: ' + MAX_METRIC_SERIES);
  }
  validateLabelCount(labels, name);

  if (!Array.isArray(buckets)) throw new Error('Buckets must be an array');
  var clean: number[] = [];
  var seen: Record<number, boolean> = {};
  buckets.forEach(function(b) {
    if (typeof b !== 'number' || isNaN(b) || !isFinite(b)) return;
    if (seen[b]) return;
    seen[b] = true;
    clean.push(b);
  });
  clean.sort(function(a, b) { return a - b; });
  if (clean.length === 0) throw new Error('Buckets cannot be empty after normalization');

  var key = metricKey(name, labels);
  if (!registry.histograms[key]) {
    registry.histograms[key] = { name, buckets: clean, values: [], __labels: safeCloneLabels(labels), __key: key };
  }
  var hist = registry.histograms[key];
  hist.values!.push(value);
  if (hist.values!.length > MAX_HISTOGRAM_VALUES) hist.values!.shift();
}

// ── Getters ────────────────────────────────────────────────────────
function getMetric(name: string): any[] | null {
  var all = Object.keys(registry.counters).filter(function(k) { return registry.counters[k].name === name; }).map(function(k) { return registry.counters[k]; })
    .concat(Object.keys(registry.gauges).filter(function(k) { return registry.gauges[k].name === name; }).map(function(k) { return registry.gauges[k]; }))
    .concat(Object.keys(registry.histograms).filter(function(k) { return registry.histograms[k].name === name; }).map(function(k) { return registry.histograms[k]; }));
  return all.length === 0 ? null : all;
}

function getAllMetrics(): Registry {
  var snap: Registry = { counters: {}, gauges: {}, histograms: {} };
  Object.keys(registry.counters).forEach(function(k) {
    var m = registry.counters[k];
    snap.counters[k] = { name: m.name, value: m.value, __labels: safeCloneLabels(m.__labels), __key: m.__key };
  });
  Object.keys(registry.gauges).forEach(function(k) {
    var m = registry.gauges[k];
    snap.gauges[k] = { name: m.name, value: m.value, __labels: safeCloneLabels(m.__labels), __key: m.__key };
  });
  Object.keys(registry.histograms).forEach(function(k) {
    var m = registry.histograms[k];
    snap.histograms[k] = { name: m.name, buckets: (m.buckets || []).slice(), values: (m.values || []).slice(), __labels: safeCloneLabels(m.__labels), __key: m.__key };
  });
  return snap;
}

function resetMetrics(opts?: { resetTypes?: boolean }): void {
  registry.counters = {};
  registry.gauges = {};
  registry.histograms = {};
  if (opts && opts.resetTypes === true) metricTypeMap = {};
}

function removeMetric(name: string): number {
  var removed = 0;
  Object.keys(registry.counters).forEach(function(k) {
    if (registry.counters[k].name === name) { delete registry.counters[k]; removed++; }
  });
  Object.keys(registry.gauges).forEach(function(k) {
    if (registry.gauges[k].name === name) { delete registry.gauges[k]; removed++; }
  });
  Object.keys(registry.histograms).forEach(function(k) {
    if (registry.histograms[k].name === name) { delete registry.histograms[k]; removed++; }
  });
  if (metricTypeMap[name]) delete metricTypeMap[name];
  return removed;
}

// ── Prometheus Export ───────────────────────────────────────────────
function exportPrometheusMetrics(): string {
  var snap: Registry = {
    counters: JSON.parse(JSON.stringify(registry.counters)),
    gauges: JSON.parse(JSON.stringify(registry.gauges)),
    histograms: JSON.parse(JSON.stringify(registry.histograms)),
  };

  var lines: string[] = [];

  var nameSet: Record<string, boolean> = {};
  Object.keys(snap.counters).forEach(function(k) { nameSet[snap.counters[k].name] = true; });
  Object.keys(snap.gauges).forEach(function(k) { nameSet[snap.gauges[k].name] = true; });
  Object.keys(snap.histograms).forEach(function(k) { nameSet[snap.histograms[k].name] = true; });
  var sortedNames = Object.keys(nameSet).sort();

  sortedNames.forEach(function(name) {
    var isCounter = Object.keys(snap.counters).some(function(k) { return snap.counters[k].name === name; });
    var isHistogram = Object.keys(snap.histograms).some(function(k) { return snap.histograms[k].name === name; });

    if (helpTexts[name]) lines.push('# HELP ' + name + ' ' + sanitizeHelpText(helpTexts[name]));

    if (isCounter) {
      lines.push('# TYPE ' + name + ' counter');
      var cMetrics = Object.keys(snap.counters).filter(function(k) { return snap.counters[k].name === name; });
      cMetrics.sort(function(a, b) { return snap.counters[a].__key.localeCompare(snap.counters[b].__key); });
      cMetrics.forEach(function(k) {
        var val: number = snap.counters[k].value!;
        if (typeof val === 'number' && (isNaN(val) || !isFinite(val))) return;
        var lbl = labelString(snap.counters[k].__labels);
        lines.push(name + lbl + ' ' + fmt(val));
      });
    } else if (isHistogram) {
      lines.push('# TYPE ' + name + ' histogram');
      var hMetrics = Object.keys(snap.histograms).filter(function(k) { return snap.histograms[k].name === name; });
      hMetrics.sort(function(a, b) { return snap.histograms[a].__key.localeCompare(snap.histograms[b].__key); });

      hMetrics.forEach(function(k) {
        var m = snap.histograms[k];
        var sorted = (m.values || []).slice().sort(function(a, b) { return a - b; });
        var len = sorted.length;
        var baseLbl = labelString(m.__labels);

        if (len === 0) return;
        var sum = sorted.reduce(function(a, b) { return a + b; }, 0);

        (m.buckets || []).forEach(function(bound) {
          var cnt = 0;
          for (var si = 0; si < sorted.length; si++) { if (sorted[si] <= bound) cnt++; }
          var leLbl = baseLbl ? baseLbl.slice(0, -1) + ',le="' + fmt(bound) + '"}' : '{le="' + fmt(bound) + '"}';
          lines.push(name + '_bucket' + leLbl + ' ' + cnt);
        });
        var infLbl = baseLbl ? baseLbl.slice(0, -1) + ',le="+Inf"}' : '{le="+Inf"}';
        lines.push(name + '_bucket' + infLbl + ' ' + len);

        if (baseLbl) {
          lines.push(name + '_sum' + baseLbl + ' ' + fmt(sum));
          lines.push(name + '_count' + baseLbl + ' ' + len);
        } else {
          lines.push(name + '_sum ' + fmt(sum));
          lines.push(name + '_count ' + len);
        }

        if (len > 0) {
          var p50Idx = Math.min(Math.floor(len * 0.5), len - 1);
          var p95Idx = Math.min(Math.floor(len * 0.95), len - 1);
          var p99Idx = Math.min(Math.floor(len * 0.99), len - 1);
          if (baseLbl) {
            lines.push(name + '_p50' + baseLbl + ' ' + fmt(sorted[p50Idx]));
            lines.push(name + '_p95' + baseLbl + ' ' + fmt(sorted[p95Idx]));
            lines.push(name + '_p99' + baseLbl + ' ' + fmt(sorted[p99Idx]));
          } else {
            lines.push(name + '_p50 ' + fmt(sorted[p50Idx]));
            lines.push(name + '_p95 ' + fmt(sorted[p95Idx]));
            lines.push(name + '_p99 ' + fmt(sorted[p99Idx]));
          }
        }
      });
    } else {
      lines.push('# TYPE ' + name + ' gauge');
      var gMetrics = Object.keys(snap.gauges).filter(function(k) { return snap.gauges[k].name === name; });
      gMetrics.sort(function(a, b) { return snap.gauges[a].__key.localeCompare(snap.gauges[b].__key); });
      gMetrics.forEach(function(k) {
        var val: number = snap.gauges[k].value!;
        if (typeof val === 'number' && (isNaN(val) || !isFinite(val))) return;
        var lbl = labelString(snap.gauges[k].__labels);
        lines.push(name + lbl + ' ' + fmt(val));
      });
    }
  });

  return lines.length > 0 ? lines.join('\n') + '\n' : '';
}

// ── Health gauge helpers ────────────────────────────────────────────
const HEALTH_HEALTHY = 2;
const HEALTH_DEGRADED = 1;
const HEALTH_CRITICAL = 0;

// ── Aggregate from domain metrics (with live health check) ───────────
async function aggregateAllMetrics(): Promise<string> {
  // Default to healthy, then run live health checks
  let systemStatus = HEALTH_HEALTHY;
  let postgresStatus = HEALTH_HEALTHY;
  let pgvectorStatus = HEALTH_HEALTHY;
  let retrievalStatus = HEALTH_HEALTHY;
  let graphStatus = HEALTH_HEALTHY;
  let cacheStatus = HEALTH_HEALTHY;

  try {
    // Health logic lives in lib/health.js (webpack-resolvable)
    const { getSystemHealth } = require('./health');

    if (typeof getSystemHealth === 'function') {
      const health = await getSystemHealth();

      // Map status string → gauge value
      function statusToValue(s: string): number {
        if (s === 'healthy') return HEALTH_HEALTHY;
        if (s === 'degraded') return HEALTH_DEGRADED;
        return HEALTH_CRITICAL;
      }

      systemStatus = statusToValue(health.status);

      if (health.checks) {
        postgresStatus  = health.checks.postgres?.ok  ? HEALTH_HEALTHY : HEALTH_CRITICAL;
        pgvectorStatus  = health.checks.pgvector?.ok ? HEALTH_HEALTHY : HEALTH_DEGRADED;
        retrievalStatus = health.checks.retrieval?.ok ? HEALTH_HEALTHY : HEALTH_DEGRADED;
        graphStatus     = health.checks.graph?.ok     ? HEALTH_HEALTHY : HEALTH_DEGRADED;
        cacheStatus     = health.checks.cache?.ok     ? HEALTH_HEALTHY : HEALTH_DEGRADED;
      }
    }
  } catch (err) {
    // Health modules unavailable — degrade gauges but don't crash
    systemStatus    = HEALTH_DEGRADED;
    postgresStatus  = HEALTH_DEGRADED;
    pgvectorStatus  = HEALTH_DEGRADED;
    retrievalStatus = HEALTH_DEGRADED;
    graphStatus     = HEALTH_DEGRADED;
    cacheStatus     = HEALTH_DEGRADED;
  }

  setGauge('system_health_status',       systemStatus);
  setGauge('postgres_health',          postgresStatus);
  setGauge('pgvector_health',          pgvectorStatus);
  setGauge('retrieval_runtime_health', retrievalStatus);
  setGauge('graph_runtime_health',     graphStatus);
  setGauge('cache_runtime_health',     cacheStatus);

  return exportPrometheusMetrics();
}

export {
  incrementCounter,
  setGauge,
  observeHistogram,
  getMetric,
  getAllMetrics,
  resetMetrics,
  removeMetric,
  exportPrometheusMetrics,
  aggregateAllMetrics,
  HEALTH_HEALTHY,
  HEALTH_DEGRADED,
  HEALTH_CRITICAL,
  helpTexts,
  registry,
};
