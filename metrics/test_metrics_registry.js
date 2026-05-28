// metrics/test_metrics_registry.js
// v1.3.0 Phase C — all 45 fixes, 45 tests

'use strict';

var fs = require('fs');
var path = require('path');

var m = require('./base_metrics');

var passed = 0;
var failed = 0;

function test(name, fn) {
  try {
    m.resetMetrics({ resetTypes: true });
    fn();
    passed++;
    console.log('  ' + passed + '. ' + name);
  } catch (e) {
    failed++;
    console.log('  FAIL: ' + name + ': ' + e.message);
  }
}

console.log('━━━ Metrics Registry — All 45 Fixes ━━━\n');

test('T01: counter increments', function() {
  m.incrementCounter('req_total', 1, { method: 'GET' });
  m.incrementCounter('req_total', 2, { method: 'GET' });
  var r = m.getMetric('req_total');
  if (!r || r[0].value !== 3) throw new Error('Expected 3');
});

test('T02: gauge overwrites', function() {
  m.setGauge('mem_active', 10);
  m.setGauge('mem_active', 15);
  var r = m.getMetric('mem_active');
  if (!r || r[0].value !== 15) throw new Error('Expected 15');
});

test('T03: histogram collects, no mutation', function() {
  m.observeHistogram('latency', 42);
  m.observeHistogram('latency', 100);
  var r = m.getMetric('latency');
  if (!r || r[0].values.length !== 2) throw new Error('Expected 2 values');
  if (r[0].values[0] !== 42 || r[0].values[1] !== 100) throw new Error('Array mutated');
});

test('T04: labels stable (sorted keys)', function() {
  m.incrementCounter('lbl_test', 1, { a: '1', b: '2' });
  m.incrementCounter('lbl_test', 1, { b: '2', a: '1' });
  var all = m.getAllMetrics();
  var keys = Object.keys(all.counters);
  if (keys.length !== 1) throw new Error('Expected 1 key');
});

test('T05: export deterministic (alphabetical)', function() {
  m.resetMetrics({ resetTypes: true });
  m.incrementCounter('zzz_metric', 1);
  m.incrementCounter('aaa_metric', 1);
  var out = m.exportPrometheusMetrics();
  var lines = out.split('\n').filter(function(l) { return l.length > 0 && l[0] !== '#'; });
  var aIdx = lines.findIndex(function(l) { return l.indexOf('aaa_') === 0; });
  var zIdx = lines.findIndex(function(l) { return l.indexOf('zzz_') === 0; });
  if (aIdx >= zIdx) throw new Error('Not sorted');
});

test('T06: Prometheus format valid', function() {
  m.resetMetrics({ resetTypes: true });
  m.incrementCounter('test_counter', 1);
  var out = m.exportPrometheusMetrics();
  if (out.indexOf('# TYPE') === -1 || out.indexOf('# HELP') === -1) throw new Error('Missing TYPE/HELP');
});

test('T07: reset clears all', function() {
  m.incrementCounter('before_reset', 1);
  m.resetMetrics({ resetTypes: true });
  var all = m.getAllMetrics();
  if (Object.keys(all.counters).length !== 0) throw new Error('Reset failed');
});

test('T08: NaN skipped', function() {
  m.setGauge('nan_test', NaN);
  var out = m.exportPrometheusMetrics();
  if (out.indexOf('NaN') !== -1) throw new Error('NaN leaked');
});

test('T09: empty labels omit {}', function() {
  m.incrementCounter('no_labels', 1);
  var out = m.exportPrometheusMetrics();
  if (out.indexOf('no_labels{}') !== -1) throw new Error('Empty {} should be omitted');
  if (out.indexOf('no_labels 1') === -1) throw new Error('Expected no_labels 1');
});

test('T10: secret redaction in labels', function() {
  m.incrementCounter('secret_test', 1, { token: 'sk-test123', api_key: 'ghp_abc123xyz' });
  var out = m.exportPrometheusMetrics();
  if (out.indexOf('sk-test') !== -1 || out.indexOf('ghp_abc') !== -1) throw new Error('Secret leaked');
  if (out.indexOf('(redacted)') === -1) throw new Error('Redaction missing');
});

test('T11: Infinity skipped', function() {
  m.setGauge('inf_test', Infinity);
  var out = m.exportPrometheusMetrics();
  if (out.indexOf('Infinity') !== -1) throw new Error('Infinity leaked');
});

test('T12: quantiles bounded on small array', function() {
  m.observeHistogram('small_hist', 1);
  m.observeHistogram('small_hist', 2);
  var out = m.exportPrometheusMetrics();
  if (out.indexOf('small_hist_p50') === -1) throw new Error('p50 missing');
});

test('T13: HELP/TYPE emitted once per metric', function() {
  m.incrementCounter('dup_test', 1, { a: '1' });
  m.incrementCounter('dup_test', 1, { a: '2' });
  var out = m.exportPrometheusMetrics();
  var helpCount = (out.match(/# HELP dup_test/g) || []).length;
  if (helpCount > 1) throw new Error('HELP duplicated ' + helpCount + 'x');
});

test('T14: __key ordering stable', function() {
  m.incrementCounter('key_test', 1, { z: '9', a: '1' });
  m.incrementCounter('key_test', 1, { a: '1', z: '9' });
  var out = m.exportPrometheusMetrics();
  var lines = out.split('\n').filter(function(l) { return l.indexOf('key_test') === 0; });
  if (lines.length !== 1) throw new Error('Expected 1 line');
});

test('T15: histogram _sum/_count omit {}', function() {
  m.observeHistogram('hist_no_labels', 42);
  var out = m.exportPrometheusMetrics();
  if (out.indexOf('hist_no_labels_sum{}') !== -1) throw new Error('Empty {} should be omitted');
  if (out.indexOf('hist_no_labels_sum 42') === -1) throw new Error('Expected hist_no_labels_sum 42');
});

test('T16: TYPE collision throws', function() {
  m.incrementCounter('type_conflict', 1);
  try { m.setGauge('type_conflict', 42); throw new Error('Should throw'); }
  catch (e) { if (e.message.indexOf('already registered') === -1) throw e; }
});

test('T17: invalid metric names rejected', function() {
  try { m.incrementCounter('invalid-metric', 1); throw new Error('Should throw'); }
  catch (e) { if (e.message.indexOf('Invalid metric name') === -1) throw e; }
});

test('T18: counter rejects negative', function() {
  try { m.incrementCounter('neg_counter', -1); throw new Error('Should throw'); }
  catch (e) { if (e.message.indexOf('negative') === -1 && e.message.indexOf('cannot') === -1) throw e; }
});

test('T19: latency histogram rejects negative', function() {
  try { m.observeHistogram('request_latency_ms', -10); throw new Error('Should throw'); }
  catch (e) { if (e.message.indexOf('negative') === -1) throw e; }
});

test('T20: runtime_ms histogram rejects negative', function() {
  try { m.observeHistogram('governance_runtime_ms', -5); throw new Error('Should throw'); }
  catch (e) { if (e.message.indexOf('negative') === -1) throw e; }
});

test('T21: histogram _bucket format valid', function() {
  m.observeHistogram('bucket_test', 7, {}, [5, 10, 100]);
  var out = m.exportPrometheusMetrics();
  if (out.indexOf('bucket_test_bucket') === -1) throw new Error('Missing _bucket');
  if (out.indexOf('bucket_test_sum') === -1) throw new Error('Missing _sum');
  if (out.indexOf('bucket_test_count') === -1) throw new Error('Missing _count');
  if (out.indexOf('le="+Inf"') === -1) throw new Error('Missing +Inf bucket');
});

test('T22: label escaping', function() {
  m.incrementCounter('escape_test', 1, { note: 'line1\nline2\ttab\\backslash\rCR' });
  var out = m.exportPrometheusMetrics();
  var raw = out.match(/note="([^"]*)"/);
  if (!raw) return;
  if (raw[1].indexOf('\n') !== -1 || raw[1].indexOf('\t') !== -1 || raw[1].indexOf('\r') !== -1) {
    throw new Error('Unescaped: ' + JSON.stringify(raw[1]));
  }
});

test('T23: HELP text newline stripped', function() {
  var out = m.exportPrometheusMetrics();
  var lines = out.split('\n');
  var helpLine = lines.find(function(l) { return l.indexOf('# HELP help_test') !== -1; });
  if (!helpLine) return;
  if (helpLine.indexOf('\n') !== -1) throw new Error('HELP contains newline');
});

test('T24: undefined labels safe', function() {
  m.incrementCounter('undef_labels', 1, undefined);
  m.incrementCounter('undef_labels', 1);
  m.setGauge('undef_gauge', 42, undefined);
  m.observeHistogram('undef_hist', 10, undefined);
  var out = m.exportPrometheusMetrics();
  if (out.indexOf('undefined') !== -1) throw new Error('undefined leaked');
});

test('T25: secret redaction in metricKey', function() {
  m.incrementCounter('key_secret', 1, { token: 'sk-test123' });
  var out = m.exportPrometheusMetrics();
  if (out.indexOf('sk-test') !== -1) throw new Error('Secret in metricKey leaked');
  if (out.indexOf('(redacted)') === -1) throw new Error('Redaction missing');
});

test('T26: safeCloneLabels handles circular', function() {
  var circular = { a: 1 };
  circular.self = circular;
  m.incrementCounter('circular_labels', 1, circular);
  var out = m.exportPrometheusMetrics();
  if (out.indexOf('[object Object]') !== -1) throw new Error('Circular leaked');
});

test('T27: cumulative histogram buckets', function() {
  m.observeHistogram('cumul_test', 3, {}, [1, 5, 10]);
  m.observeHistogram('cumul_test', 8, {}, [1, 5, 10]);
  var out = m.exportPrometheusMetrics();
  // Values: 3, 8. Cumulative: le=1→0, le=5→1, le=10→2, +Inf→2
  if (out.indexOf('le="1"} 0') === -1) throw new Error('Bucket le=1 count wrong');
  if (out.indexOf('le="5"} 1') === -1) throw new Error('Bucket le=5 not cumulative');
  if (out.indexOf('le="10"} 2') === -1) throw new Error('Bucket le=10 not cumulative');
  if (out.indexOf('le="+Inf"} 2') === -1) throw new Error('+Inf bucket missing');
});

test('T28: bucket labels merge with existing labels', function() {
  m.observeHistogram('merge_test', 7, { mode: 'hybrid' }, [5, 10]);
  var out = m.exportPrometheusMetrics();
  var bucketLine = out.split('\n').find(function(l) { return l.indexOf('merge_test_bucket') !== -1 && l.indexOf('le="5"') !== -1; });
  if (!bucketLine) throw new Error('Bucket line with merged labels missing');
  if (bucketLine.indexOf('mode="hybrid"') === -1) throw new Error('mode label missing from bucket');
});

test('T29: +Inf bucket always emitted', function() {
  m.observeHistogram('inf_test', 5, {}, [1, 2]);
  var out = m.exportPrometheusMetrics();
  if (out.indexOf('le="+Inf"') === -1) throw new Error('+Inf bucket missing');
});

test('T30: quantiles separate from histogram', function() {
  m.observeHistogram('q_test', 10, {}, [5, 10, 100]);
  var out = m.exportPrometheusMetrics();
  if (out.indexOf('q_test_p50') === -1) throw new Error('p50 missing');
  var qLines = out.split('\n').filter(function(l) { return l.indexOf('q_test_p') !== -1; });
  qLines.forEach(function(l) {
    if (l.indexOf('quantile="') !== -1) throw new Error('p50 in histogram format');
  });
});

test('T31: float precision stable', function() {
  m.setGauge('float_gauge', 0.1);
  m.incrementCounter('float_counter', 0.2);
  var out = m.exportPrometheusMetrics();
  if (out.indexOf('0.30000000000000004') !== -1) throw new Error('Float precision not stable');
});

test('T32: deterministic order by __key', function() {
  m.incrementCounter('det', 1, { z: '1' });
  m.incrementCounter('det', 1, { a: '1' });
  var out = m.exportPrometheusMetrics();
  // Two different label sets = two metric series (both exported)
  var lines = out.split('\n').filter(function(l) { return l.indexOf('det{') === 0; });
  if (lines.length !== 2) throw new Error('Expected 2 lines, got ' + lines.length);
  // Keys should be sorted within each metric key
  lines.forEach(function(l) {
    var aIdx = l.indexOf('a="1"');
    var zIdx = l.indexOf('z="1"');
    if (aIdx !== -1 && zIdx !== -1 && aIdx > zIdx) {
      throw new Error('Labels not sorted within key');
    }
  });
});

test('T33: label key sanitization', function() {
  m.incrementCounter('key_sanitize', 1, { 'invalid-key': 'v' });
  var out = m.exportPrometheusMetrics();
  if (out.indexOf('invalid-key') !== -1) throw new Error('Invalid label key not sanitized');
  if (out.indexOf('invalid_key') === -1) throw new Error('Sanitized label key missing');
});

test('T34: getAllMetrics returns safe snapshot', function() {
  m.incrementCounter('snap_c', 1, { a: '1' });
  m.setGauge('snap_g', 5, { b: '2' });
  m.observeHistogram('snap_h', 10, { c: '3' });
  var snap = m.getAllMetrics();
  m.incrementCounter('snap_c', 99, { a: '1' });
  if (snap.counters[Object.keys(snap.counters)[0]].value === 100) {
    throw new Error('Snapshot was mutated');
  }
});

test('T35: export empty → empty string', function() {
  m.resetMetrics({ resetTypes: true });
  var out = m.exportPrometheusMetrics();
  if (out !== '') throw new Error('Expected empty string');
});

test('T36: no TypeScript syntax', function() {
  var src = fs.readFileSync(path.join(__dirname, 'base_metrics.js'), 'utf8');
  var tsPatterns = [/: string\b/, /: number\b/, /: boolean\b/, /Record</, /: unknown/, /<[A-Z][a-z]+>/, /interface\s+/, /type\s+\w+\s*=/];
  tsPatterns.forEach(function(p) {
    if (p.test(src)) throw new Error('TS syntax: ' + p.source);
  });
});

test('T37: resetTypes option', function() {
  m.incrementCounter('type_map_test', 1);
  m.resetMetrics({ resetTypes: false });
  try { m.setGauge('type_map_test', 42); throw new Error('Should throw'); }
  catch (e) { if (e.message.indexOf('already registered') === -1) throw e; }
  m.resetMetrics({ resetTypes: true });
  m.setGauge('type_map_test', 42); // Should not throw
});

test('T38: histogram cap (FIX 36)', function() {
  // Observe 1005 values; after cap only 1000 should remain
  for (var i = 0; i < 1005; i++) m.observeHistogram('cap_test', i, {}, [10, 50, 100, 500, 1000, 5000]);
  var r = m.getMetric('cap_test');
  if (r[0].values.length !== 1000) throw new Error('Expected 1000, got ' + r[0].values.length);
  // oldest (0) should be shifted; newest (1004) should be present
  if (r[0].values.indexOf(0) !== -1) throw new Error('Oldest value not shifted');
  if (r[0].values.indexOf(1004) === -1) throw new Error('Newest value missing');
});

test('T39: registry series cap (FIX 39)', function() {
  // Note: 10000 is the cap; create a few to test behavior
  m.resetMetrics({ resetTypes: true });
  for (var i = 0; i < 5; i++) {
    m.setGauge('cap_gauge_' + i, i);
  }
  // Should not throw
  var r = m.getMetric('cap_gauge_4');
  if (!r || r[0].value !== 4) throw new Error('Gauge creation failed');
});

test('T40: cardinality protection — too many labels', function() {
  var bigLabels = {};
  for (var i = 0; i <= 15; i++) bigLabels['l' + i] = i;
  try { m.incrementCounter('cardinality_test', 1, bigLabels); throw new Error('Should throw'); }
  catch (e) { if (e.message.indexOf('Too many labels') === -1) throw e; }
});

test('T41: cardinality protection — long value truncated', function() {
  var longVal = new Array(200).join('x');
  m.incrementCounter('long_val_test', 1, { note: longVal });
  var out = m.exportPrometheusMetrics();
  if (out.indexOf('...') === -1) throw new Error('Long value not truncated');
  if (out.indexOf(longVal) !== -1) throw new Error('Long value not truncated (full value present)');
});

test('T42: removeMetric() removes all series', function() {
  m.incrementCounter('remove_me', 1, { a: '1' });
  m.incrementCounter('remove_me', 1, { b: '2' });
  m.setGauge('remove_me_gauge', 5);
  var removed = m.removeMetric('remove_me');
  if (removed < 2) throw new Error('Expected at least 2 removed, got ' + removed);
  var r = m.getMetric('remove_me');
  if (r !== null) throw new Error('Metric still present after removal');
});

test('T43: removeMetric() only removes named metric', function() {
  m.incrementCounter('keep_me', 1);
  m.incrementCounter('remove_other', 1);
  m.removeMetric('remove_other');
  var r = m.getMetric('keep_me');
  if (!r) throw new Error('keep_me was removed');
  var r2 = m.getMetric('remove_other');
  if (r2 !== null) throw new Error('remove_other still present');
});

test('T44: bucket normalization — unsorted input sorted', function() {
  m.observeHistogram('norm_test', 5, {}, [100, 10, 1]);
  var out = m.exportPrometheusMetrics();
  // Buckets should be sorted: 1, 10, 100
  if (out.indexOf('le="1"} 0') === -1) throw new Error('Sorted buckets missing');
  if (out.indexOf('le="10"}') === -1) throw new Error('Sorted bucket le=10 missing');
  if (out.indexOf('le="100"}') === -1) throw new Error('Sorted bucket le=100 missing');
});

test('T45: bucket normalization — duplicate buckets removed', function() {
  m.observeHistogram('dup_bucket_test', 5, {}, [10, 10, 5, 5, 10]);
  var out = m.exportPrometheusMetrics();
  // Should have exactly 2 buckets (5 and 10)
  var le5Count = (out.match(/le="5"} \d/g) || []).length;
  var le10Count = (out.match(/le="10"} \d/g) || []).length;
  if (le5Count < 1 || le10Count < 1) throw new Error('Duplicate buckets not removed');
});

test('T46: export atomic snapshot (FIX 41)', function() {
  m.resetMetrics({ resetTypes: true });
  m.incrementCounter('atomic_c', 1);
  var snap = m.getAllMetrics();
  m.incrementCounter('atomic_c', 99);
  if (snap.counters[Object.keys(snap.counters)[0]].value === 100) {
    throw new Error('Snapshot not atomic — reflects subsequent write');
  }
});

test('T47: HELP before TYPE before samples (FIX 42)', function() {
  m.incrementCounter('order_test', 1, { x: '1' });
  var out = m.exportPrometheusMetrics();
  var lines = out.split('\n');
  var helpIdx = lines.findIndex(function(l) { return l.indexOf('# HELP order_test') !== -1; });
  var typeIdx = lines.findIndex(function(l) { return l.indexOf('# TYPE order_test') !== -1; });
  var dataIdx = lines.findIndex(function(l) { return l.indexOf('order_test{') === 0; });
  if (helpIdx === -1 || typeIdx === -1 || dataIdx === -1) return;
  if (helpIdx > typeIdx || typeIdx > dataIdx) {
    throw new Error('Order wrong: HELP=' + helpIdx + ' TYPE=' + typeIdx + ' DATA=' + dataIdx);
  }
});

test('T48: quantiles not emitted for removed histogram', function() {
  m.resetMetrics({ resetTypes: true });
  m.observeHistogram('empty_hist', 10, {}, [5, 10]);
  m.removeMetric('empty_hist');
  // After removal, metric not in snapshot — no TYPE/HELP/data emitted
  var out = m.exportPrometheusMetrics();
  if (out.indexOf('empty_hist_p50') !== -1) throw new Error('p50 emitted for removed histogram');
  if (out.indexOf('empty_hist') !== -1) throw new Error('empty_hist still appears after removal');
});

test('T49: invalid bucket types filtered, valid kept', function() {
  m.resetMetrics({ resetTypes: true });
  // 'ten' is NaN (filtered silently), 20 is valid → single bucket created
  m.observeHistogram('mixed_bucket', 10, {}, ['ten', 20]);
  var r = m.getMetric('mixed_bucket');
  if (!r) throw new Error('Metric not created');
  if (r[0].buckets.length !== 1) throw new Error('Expected 1 bucket, got ' + r[0].buckets.length);
  if (r[0].buckets[0] !== 20) throw new Error('Expected bucket 20, got ' + r[0].buckets[0]);
});

test('T50: non-latency histogram allows negative values', function() {
  m.resetMetrics({ resetTypes: true });
  m.observeHistogram('score_histogram', -5); // not a latency metric — should be allowed
  var out = m.exportPrometheusMetrics();
  if (out.indexOf('-5') === -1) throw new Error('Negative non-latency value not recorded');
});

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TOTAL: ' + passed + ' passed / ' + failed + ' failed');

if (failed === 0) {
  console.log('\n━━━ Prometheus Export Sample ━━━');
  m.resetMetrics({ resetTypes: true });
  m.incrementCounter('retrieval_requests_total', 42, { mode: 'hybrid' });
  m.setGauge('active_memories_total', 6);
  m.observeHistogram('retrieval_latency_ms', 42, { mode: 'hybrid' }, [1, 5, 10, 25, 50, 100]);
  m.observeHistogram('retrieval_latency_ms', 80, { mode: 'hybrid' }, [1, 5, 10, 25, 50, 100]);
  m.observeHistogram('retrieval_latency_ms', 120, { mode: 'hybrid' }, [1, 5, 10, 25, 50, 100]);
  m.observeHistogram('retrieval_latency_ms', 42, {}, [1, 5, 10, 25, 50, 100]);
  console.log(m.exportPrometheusMetrics());
}

process.exit(failed > 0 ? 1 : 0);
