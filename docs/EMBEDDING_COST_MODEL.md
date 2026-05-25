# Embedding Cost Model

**Version:** 1.0.0
**Status:** Draft
**Related:** `V1_2_0_EMBEDDING_ARCHITECTURE_DECISION.md`

---

## 1. Cost Components

### 1.1 OpenAI `text-embedding-3-small`

| Component | Cost | Notes |
|-----------|------|-------|
| **Input tokens** | $0.02 / 1M tokens | Batch API: $0.01 / 1M tokens |
| **Output tokens** | N/A | Embeddings are fixed-size vectors |
| **API requests** | N/A | No per-request fee |
| **Storage (pgvector)** | N/A | Local PostgreSQL (no storage cost) |
| **Network egress** | N/A | Negligible (< 1KB per embedding) |

**Example Calculation (76 files):**

Assume:
- Avg. tokens per file: ~2,000 tokens
- Total tokens: 76 × 2,000 = 152,000 tokens
- Cost: 152,000 / 1,000,000 × $0.02 = **$0.00304** (~¥0.02)

**Monthly Cost (1000 queries):**

Assume:
- Avg. tokens per query: ~100 tokens
- Total tokens: 1000 × 100 = 100,000 tokens
- Cost: 100,000 / 1,000,000 × $0.02 = **$0.002** (~¥0.01)

**Conclusion:** OpenAI `text-embedding-3-small` is **very cheap** for small corpus (~76 files). Cost is negligible (< $0.01/month).

---

### 1.2 OpenAI `text-embedding-3-large`

| Component | Cost | Notes |
|-----------|------|-------|
| **Input tokens** | $0.13 / 1M tokens | Batch API: $0.065 / 1M tokens |
| **Output tokens** | N/A | Embeddings are fixed-size vectors |
| **API requests** | N/A | No per-request fee |
| **Storage (pgvector)** | N/A | Local PostgreSQL (no storage cost) |
| **Network egress** | N/A | Negligible (< 1KB per embedding) |

**Example Calculation (76 files):**

Assume:
- Avg. tokens per file: ~2,000 tokens
- Total tokens: 76 × 2,000 = 152,000 tokens
- Cost: 152,000 / 1,000,000 × $0.13 = **$0.01976** (~¥0.14)

**Conclusion:** OpenAI `text-embedding-3-large` is **cheap** for small corpus, but **6.5× more expensive** than `text-embedding-3-small`.

---

### 1.3 Ollama (Local Embedding)

| Component | Cost | Notes |
|-----------|------|-------|
| **Compute (CPU)** | $0 | Uses local CPU (no API cost) |
| **Compute (GPU)** | $0 | Uses local GPU (if available) |
| **Storage (pgvector)** | $0 | Local PostgreSQL (no storage cost) |
| **Electricity** | ~$0.01/hour | Negligible |
| **Maintenance** | Time cost | Ollama setup + updates |

**Conclusion:** Ollama is **FREE** (no API cost). Only cost is electricity + maintenance.

---

### 1.4 Cohere `embed-english-v3`

| Component | Cost | Notes |
|-----------|------|-------|
| **Input tokens** | $0.10 / 1M tokens | More expensive than OpenAI |
| **Output tokens** | N/A | Embeddings are fixed-size vectors |
| **API requests** | N/A | No per-request fee |
| **Storage (pgvector)** | N/A | Local PostgreSQL (no storage cost) |
| **Network egress** | N/A | Negligible (< 1KB per embedding) |

**Conclusion:** Cohere is **NOT RECOMMENDED** (more expensive than OpenAI, lower quality).

---

## 2. Cost Optimization Strategies

### 2.1 Caching (Highest Impact)

**Strategy:** Cache embeddings (avoid re-generating).

**Implementation:**
- In-memory cache (`Map<string, number[]>`)
- Redis cache (distributed)
- PostgreSQL cache (`embedding_cache` table)

**Cost Savings:**
- OpenAI: 100% savings for cached queries
- Ollama: 100% savings for cached queries (latency improvement)

**Example:**
- Without cache: 1000 queries × $0.002 = $2.00
- With cache (80% hit rate): 200 queries × $0.002 = $0.40
- **Savings: $1.60 (80%)**

---

### 2.2 Batch API (OpenAI)

**Strategy:** Use OpenAI Batch API (50% discount).

**Implementation:**
- Collect multiple texts
- Send batch request
- Process batch response

**Cost Savings:**
- OpenAI: 50% savings ($0.02 → $0.01 / 1M tokens)

**Example:**
- Without batch: 152,000 tokens × $0.02 = $0.00304
- With batch: 152,000 tokens × $0.01 = $0.00152
- **Savings: $0.00152 (50%)**

---

### 2.3 Hybrid Routing (Local First, Cloud Fallback)

**Strategy:** Use Ollama (free) when available, fallback to OpenAI (cost) when Ollama fails.

**Implementation:**
- Check Ollama availability (localhost:11434)
- If Ollama available → use Ollama (free)
- If Ollama fails → fallback to OpenAI (cost)

**Cost Savings:**
- Ollama available: 100% savings (no OpenAI API calls)
- Ollama unavailable: 0% savings (use OpenAI)

**Example:**
- 1000 queries, Ollama available 80% → 800 free, 200 paid
- Cost: 200 × $0.002 = $0.40
- **Savings: $1.60 (80%)**

---

### 2.4 Dimensionality Reduction (OpenAI)

**Strategy:** Reduce embedding dimensions (1536 → 256) to lower storage + improve search speed.

**Implementation:**
- OpenAI `text-embedding-3-small` supports configurable dimensions
- Set `dimensions=256` in API request

**Trade-off:**
- ✅ Lower storage cost (PostgreSQL)
- ✅ Faster vector search (less data to scan)
- ❌ Lower retrieval quality (less semantic information)

**Cost Savings:**
- Storage: ~6× less (1536 → 256 dimensions)
- Latency: ~2× faster (less data to scan)

**Example:**
- 76 files × 1536 dims × 4 bytes = 456 KB
- 76 files × 256 dims × 4 bytes = 76 KB
- **Savings: 380 KB (83%)**

---

## 3. Cost Benchmarks

### 3.1 One-Time Embedding Generation (76 files)

| Provider | Cost | Latency | Quality |
|----------|------|---------|---------|
| OpenAI `text-embedding-3-small` | $0.003 | ~5s | 🟢 Excellent |
| OpenAI `text-embedding-3-large` | $0.020 | ~10s | 🟢 Excellent |
| Ollama `nomic-embed-text` | $0 | ~15s | 🟡 Good |
| Ollama `bge-m3` | $0 | ~30s | 🟢 Excellent |
| Cohere `embed-english-v3` | $0.015 | ~8s | 🟢 Excellent |

**Recommendation:** OpenAI `text-embedding-3-small` (cheapest + highest quality).

---

### 3.2 Monthly Query Cost (1000 queries)

| Provider | Cost | Latency | Quality |
|----------|------|---------|---------|
| OpenAI `text-embedding-3-small` | $0.002 | ~50ms | 🟢 Excellent |
| OpenAI `text-embedding-3-large` | $0.013 | ~100ms | 🟢 Excellent |
| Ollama `nomic-embed-text` | $0 | ~200ms | 🟡 Good |
| Ollama `bge-m3` | $0 | ~300ms | 🟢 Excellent |
| Cohere `embed-english-v3` | $0.010 | ~80ms | 🟢 Excellent |

**Recommendation:** Hybrid (Ollama + OpenAI) for cost optimization.

---

## 4. Token Cost Agent (Future)

### 4.1 Purpose

Track + budget embedding API costs (prevent cost overrun).

### 4.2 Features

1. **Track:** Log all API calls (tokens used, cost incurred)
2. **Budget:** Set monthly budget (e.g., $10/month)
3. **Alert:** Warn when budget exceeds 80%
4. **Block:** Prevent API calls when budget exceeded

### 4.3 Implementation (Not in Phase B)

**Phase B:** NOT implemented (accept cost risk, track manually)

**Phase C:** Implement Token Cost Agent (track embedding cost)

**Phase D:** Integrate with Hybrid Provider (use Ollama when budget exceeded)

---

## 5. Cost Governance

### 5.1 Approval Process

| Cost | Approval Required? | Approver |
|------|---------------------|-----------|
| < $1/month | ❌ No | (none) |
| $1-10/month | ✅ Yes | Technical Lead |
| > $10/month | ✅ Yes | Engineering Manager |

### 5.2 Review Cycle

- **Monthly:** Review API costs (OpenAI dashboard)
- **Quarterly:** Optimize embedding strategy (cache, batch, hybrid)

---

## 6. Decision Record

**Decision:** Use OpenAI `text-embedding-3-small` for Phase B (lowest cost + highest quality).

**Rationale:**
1. Cost is negligible (< $0.01/month for ~76 files)
2. Quality is highest (MTEB #1)
3. Latency is low (~50ms)
4. Simple integration (just `openai` package)

**Next Action:** Implement Phase B (OpenAI embedding), track cost manually, optimize with caching + hybrid routing in Phase C/D.

---

**End of Embedding Cost Model**
