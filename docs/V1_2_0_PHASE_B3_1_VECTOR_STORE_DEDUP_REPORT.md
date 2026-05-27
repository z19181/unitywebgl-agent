# V1.2.0 Phase B.3.1 — Vector Store Dedup Report

**Date:** 2026-05-26  
**Branch:** `platform/v1.2.0-embedding-architecture`

---

## Problem Root Cause

The vector store had **embedding accumulation pollution**:
- `insertEmbedding()` used raw `INSERT INTO` without deduplication
- `upsertDocument()` deleted `document_chunks` but NOT `document_embeddings`, leaving orphan embeddings
- No unique constraint on `(chunk_id, model)` allowed unlimited duplicates
- Result: 2475 embeddings when expected ~884 (2.8x inflation)

## Before Fix Counts

| Table | Count |
|-------|-------|
| documents | 117 |
| chunks | 884 |
| embeddings | 2475 |
| orphan embeddings | 1592 |
| duplicate (chunk_id, model) | 0 (lucky) |

## Schema Changes

1. **Added unique constraint:** `ALTER TABLE document_embeddings ADD CONSTRAINT unique_chunk_model UNIQUE (chunk_id, model)`
2. **Migration auto-runs** on first `upsertDocument()` call, deduping any existing rows before adding constraint
3. **`insertEmbedding()` changed to upsert:** `ON CONFLICT (chunk_id, model) DO UPDATE SET embedding = EXCLUDED.embedding`
4. **`upsertDocument()` now cascade-deletes** old chunks + embeddings before re-inserting

## Integrity Checks (Post-Fix)

| Check | Result |
|-------|--------|
| duplicate embeddings (chunk_id+model) | **0** |
| orphan embeddings | **0** |
| orphan chunks | **0** |
| embeddings ≤ chunks × model_count | **851 ≤ 852 × 1** ✅ |

## After Fix Counts (Post-Reset Reingest)

| Table | Count |
|-------|-------|
| documents | 115 |
| chunks | 852 |
| embeddings | 851 |

(1 chunk skipped: docker/grafana dashboard JSON exceeded Ollama context length)

## Evaluation Results

| Metric | KEYWORD | SEMANTIC | HYBRID | Target |
|--------|---------|----------|--------|--------|
| Recall@5 | 0.4250 | 0.2250 | **0.5250** | ≥0.5000 ✅ |
| Precision@5 | 0.1100 | 0.1400 | 0.1400 | — |
| MRR | 0.2896 | 0.1992 | **0.4804** | — |
| NDCG@5 | 0.2807 | 0.1641 | **0.4466** | — |
| Violations | 1 | 0 | **0** | 0 ✅ |

**HYBRID vs KEYWORD baseline:** Recall +23.5%, MRR +65.9%, violations eliminated.

## Failed Query Analysis (8/20 with Recall < 1.0)

Primary failure patterns:
1. **Semantic drift:** Queries like "Five Iron Laws" retrieve SOUL.md (contains the text) instead of BASELINE.md (the authoritative source)
2. **File-level ambiguity:** Multiple docs reference same concepts; semantic search finds related but not the "expected" file
3. **Ground truth alignment:** Some expected_files may need review (e.g., Q009 expects `check-unity-webgl-build.js` but top results are relevant .md docs)

These are **coverage/path issues**, not scoring issues. No scoring changes needed.

## Embeddings Accumulation Blocker: ✅ RESOLVED

- `insertEmbedding()` is now upsert — no accumulation on re-ingest
- `upsertDocument()` cascade-deletes — no orphans
- Unique constraint enforced at DB level
- Integrity validation function available programmatically

## Conclusion: Phase B.3.1 COMPLETE

- ✅ Embeddings accumulation blocker resolved
- ✅ HYBRID Recall@5 = 0.5250 ≥ 0.5000 target
- ✅ Zero violations
- ✅ Zero orphan/duplicate embeddings
- ✅ All integrity tests pass (8/8)

**Phase B.3 tuning may continue.** Remaining gaps are coverage/ground-truth alignment issues, not scoring or infrastructure problems.
