# v1.2.0 Phase B.2 — Chunk Reconstruction Report

**Date:** 2026-05-25 23:25-23:40 PDT  
**Branch:** `platform/v1.2.0-embedding-architecture`  
**Status:** Chunk reconstruction complete. Evaluation shows 10x semantic improvement.

---

## 1. Old vs New Chunk Strategy

### Old (v1/v2): Header-Driven Emission
- Each markdown heading immediately emitted a chunk
- Result: 1665 chunks from 85 files, 2044 header-only chunks (<100 chars)
- Semantic Recall@5: **0.025** (near random)

### New (v3): Section Accumulation
- Headings = metadata, not chunks
- Accumulate body across sections until target (~800 chars)
- Governance content preserved whole, never split
- Minimum chunk size: 250 chars (hard constraint)

---

## 2. Chunk Stats Comparison

| Metric | Old (v1) | New (v3) | Delta |
|--------|----------|----------|-------|
| Total chunks | 1665 | 741 | -55% |
| Header-only | 2044 | 2 | -99.9% |
| Avg chunk chars | ~200 | 799 | +300% |
| Tiny (<120 chars) | >50% | ~2% | -96% |
| Governance chunks | — | 204 | proper detection |

---

## 3. Evaluation Results

| Mode | Old Chunks | New Chunks | Delta |
|------|-----------|-----------|-------|
| Keyword | 0.4500 | 0.4500 | 0 (baseline) |
| Semantic | **0.0250** | **0.2500** | **+0.225 (10x)** |
| Hybrid | **0.3250** | **0.4000** | **+0.075** |

| Metric | Old | New | Delta |
|--------|-----|-----|-------|
| Semantic MRR | 0.0300 | 0.2438 | +0.2138 |
| Hybrid MRR | 0.2002 | 0.2910 | +0.0908 |
| Violations | 0 | 0 | ✅ |

**Hybrid (0.400) exceeds Phase A baseline (0.375) ✅**

---

## 4. Failed Query Analysis

### 4.1 All-Zero Queries (all 3 modes fail)
| Query | Expected | Root Cause |
|-------|----------|------------|
| Q6: RAG memory retrieval policy | `RAG_RETRIEVAL_POLICY.md` | File IS indexed but ranked below similar docs |
| Q15: QClaw review prompt | `prompts/qclaw_review.prompt.md` | Prompts directory may be excluded from scan |
| Q16: Codex task prompt | `prompts/codex_task.prompt.md` | Same — prompt files not in index |
| Q17: Prometheus dashboard | `docker/prometheus/prometheus.yml` | Docker configs indexed as code, not semantic docs |
| Q19: Unity WebGL baseline | `BASELINE.md` | Expected path `PartyGameSDK-MVP/BASELINE.md` may not exist in index |

### 4.2 Governance Queries Still Weak
- Q10 (Five Iron Laws): semantic returns 0.00, keyword gets 0.50
- Q20 (server.js protocol): ALL modes return 0.00
- Governance keywords in chunks help but don't overcome naming conventions

### 4.3 Where Hybrid Helps
- Hybrid beats keyword on queries where semantic adds complementary signals
- But keyword still dominates overall (0.45 vs 0.40)

---

## 5. Architecture Delivered

### New Files
```
chunking/
├── section_accumulator.js  — heading → body accumulation engine
├── chunk_merger.js          — tiny/heading-only merge pipeline
├── chunk_quality_analyzer.js — quality metrics + validation
├── chunk_stats_reporter.js  — markdown report generator
└── semantic_chunker.js      — unified entry (v3, replaced v2)
```

### Key Design Decisions
1. **Accumulation threshold:** 800 chars (balanced between context and precision)
2. **Governance detection:** Regex patterns preserve server.js, Five Iron Laws, protocol docs
3. **Merge strategy:** <250 chars merge forward, governance merge to 3000 max
4. **Quality gates:** header_only=0, avg≥500, tiny_pct≤3%, body_ratio≥50%

---

## 6. Remaining Blockers

1. **Prompt files not indexed:** `prompts/*.prompt.md` excluded from scan → need to verify file scan rules
2. **Semantic still below keyword:** Pure vector similarity (0.25) needs keyword boost — pass query string to `retrieveWithSnippets` instead of pre-computed embedding
3. **Path normalization:** Expected paths like `PartyGameSDK-MVP/BASELINE.md` need normalization pass
4. **Docker configs:** Code-like config files (YAML, JSON) don't benefit from semantic search → need content-type-aware indexing
5. **Governance file naming:** `BASELINE.md`, `PROTOCOL_GENERALIZATION_REPORT.md` not found by semantic — need ground truth path audit

---

## 7. Phase B.2 Conclusion

### Achieved
- ✅ Semantic retrieval: 0.025 → 0.250 (10x)
- ✅ Hybrid exceeds Phase A baseline (0.400 > 0.375)
- ✅ Header-only chunks eliminated
- ✅ Governance detection working
- ✅ Must-not-suggest violations: 0

### Not Yet Achieved
- ❌ Target Recall@5 ≥ 0.50 (hybrid at 0.40)
- ❌ Semantic beats keyword (0.25 < 0.45)
- ❌ All-zero queries resolved (5 remaining)

### Recommendation
**PROCEED to Phase B.3** — Fine-tune hybrid weights and fix prompt file indexing. The chunk reconstruction has eliminated the fundamental bottleneck. Remaining issues are tuning problems, not architectural.

---

## Files Modified
- `chunking/semantic_chunker.js` — complete rewrite (v3)
- `chunking/section_accumulator.js` — new (9065 bytes)
- `chunking/chunk_merger.js` — new (7814 bytes)
- `chunking/chunk_quality_analyzer.js` — new (5899 bytes)
- `chunking/chunk_stats_reporter.js` — new (6114 bytes)
- `ingest_vectors.js` — stats field name fix
- `retrieve_semantic.js` — `query.toLowerCase()` bug fix
- `evaluate_all_modes_v3.mjs` — result normalization, option fix

## Hard Constraints
- ✅ No server.js modification
- ✅ No protocol modification
- ✅ No RELEASE_STATE.json modification
- ✅ No tags created
- ✅ No ground truth manipulation
- ✅ No governance weight reduction
