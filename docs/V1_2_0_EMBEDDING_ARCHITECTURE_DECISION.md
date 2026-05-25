# v1.2.0 Phase B.0.5 — Embedding Architecture Decision

**Version:** 1.0.0
**Phase:** B.0.5 (Architecture Decision)
**Date:** 2026-05-25
**Branch:** `platform/v1.2.0-embedding-architecture`
**Hard Constraints:** See `RAG_RETRIEVAL_POLICY.md`

---

## Executive Summary

**Decision:** NOT single choice. Multi-phase approach:

| Phase | Embedding Provider | Purpose |
|-------|-------------------|----------|
| Phase B | OpenAI `text-embedding-3-small` | Quick validation of retrieval quality |
| Phase C | Local embedding fallback (Ollama) | Offline capability, cost reduction |
| Phase D | Hybrid routing | Local first, cloud fallback, cache priority |

**Rationale:**
1. PartyGameSDK is **local development first**
2. QClaw/Codex **often offline**
3. Windows + macOS **dual environment**
4. Docker/WSL **already blocker**
5. Token Cost Agent **not implemented yet**
6. Current retrieval docs **only ~76 files**
7. Target is **Agent Runtime**, not SaaS RAG

---

## A. Candidate Solutions Comparison

### A.1 OpenAI `text-embedding-3-small`

| Dimension | Rating | Details |
|-----------|---------|---------|
| **Cost** | 🟡 MEDIUM | $0.02 / 1M tokens (input) |
| **Latency** | 🟢 GOOD | ~50ms (US East) |
| **Offline Capability** | 🔴 NONE | Requires internet |
| **Docker Compatibility** | 🟢 GOOD | Just needs `OPENAI_API_KEY` |
| **Local Development** | 🟡 MEDIUM | Requires API key + internet |
| **CI Compatibility** | 🟡 MEDIUM | Needs API key in CI secrets |
| **Windows Support** | 🟢 GOOD | Works via Node.js `openai` package |
| **macOS Support** | 🟢 GOOD | Works via Node.js `openai` package |
| **Privacy** | 🔴 LOW | Sends data to OpenAI servers |
| **Retrieval Quality** | 🟢 EXCELLENT | MTEB rank: #1 (1536 dims) |
| **Scaling** | 🟢 EXCELLENT | OpenAI handles scaling |
| **Vector Dimensions** | 🟢 FIXED | 1536 (configurable to 256/512/1024) |
| **Dependency Complexity** | 🟢 LOW | Just `openai` npm package |

**Pros:**
- ✅ High retrieval quality (MTEB #1)
- ✅ Low latency (~50ms)
- ✅ Simple integration (just `openai` package)
- ✅ Handles scaling (no infrastructure)

**Cons:**
- ❌ Requires internet (QClaw/Codex often offline)
- ❌ Privacy concerns (sends data to OpenAI)
- ❌ Cost (small 
**Best For:** Phase B (quick validation of retrieval quality)

---

### A.2 OpenAI `text-embedding-3-large`

| Dimension | Rating | Details |
|-----------|---------|---------|
| **Cost** | 🔴 HIGH | $0.13 / 1M tokens (input) |
| **Latency** | 🟡 MEDIUM | ~100ms (US East) |
| **Offline Capability** | 🔴 NONE | Requires internet |
| **Docker Compatibility** | 🟢 GOOD | Just needs `OPENAI_API_KEY` |
| **Local Development** | 🟡 MEDIUM | Requires API key + internet |
| **CI Compatibility** | 🟡 MEDIUM | Needs API key in CI secrets |
| **Windows Support** | 🟢 GOOD | Works via Node.js `openai` package |
| **macOS Support** | 🟢 GOOD | Works via Node.js `openai` package |
| **Privacy** | 🔴 LOW | Sends data to OpenAI servers |
| **Retrieval Quality** | 🟢 EXCELLENT | MTEB rank: #1 (3072 dims) |
| **Scaling** | 🟢 EXCELLENT | OpenAI handles scaling |
| **Vector Dimensions** | 🟢 FIXED | 3072 (configurable to 256/512/1024/2048) |
| **Dependency Complexity** | 🟢 LOW | Just `openai` npm package |

**Pros:**
- ✅ Highest retrieval quality (MTEB #1)
- ✅ Larger vector dimensions (3072)

**Cons:**
- ❌ **HIGHER COST** ($0.13 / 1M tokens)
- ❌ Higher latency (~100ms)
- ❌ Requires internet
- ❌ Privacy concerns

**Best For:** High-quality retrieval (if cost is not an issue)

---

### A.3 Ollama + `nomic-embed-text`

| Dimension | Rating | Details |
|-----------|---------|---------|
| **Cost** | 🟢 FREE | No API cost (local inference) |
| **Latency** | 🟡 MEDIUM | ~200ms (local CPU) / ~50ms (local GPU) |
| **Offline Capability** | 🟢 FULL | Works completely offline |
| **Docker Compatibility** | 🟡 MEDIUM | Needs Ollama Docker image |
| **Local Development** | 🟢 EXCELLENT | Works offline, no API key |
| **CI Compatibility** | 🔴 HARD | Needs Ollama installed in CI |
| **Windows Support** | 🟡 MEDIUM | WSL2 required |
| **macOS Support** | 🟢 GOOD | Native macOS support |
| **Privacy** | 🟢 HIGH | Data never leaves local machine |
| **Retrieval Quality** | 🟡 GOOD | MTEB rank: #42 (768 dims) |
| **Scaling** | 🔴 HARD | Needs GPU for scaling |
| **Vector Dimensions** | 🟢 FIXED | 768 |
| **Dependency Complexity** | 🟡 MEDIUM | Needs Ollama installed locally |

**Pros:**
- ✅ **FREE** (no API cost)
- ✅ **FULL OFFLINE** (works without internet)
- ✅ **HIGH PRIVACY** (data never leaves local machine)
- ✅ Good retrieval quality (MTEB #42)

**Cons:**
- ❌ Higher latency (~200ms on CPU)
- ❌ Needs Ollama installed (WSL2 on Windows)
- ❌ CI compatibility hard (needs Ollama in CI)
- ❌ Lower retrieval quality than OpenAI

**Best For:** Phase C (local embedding fallback)

---

### A.4 Ollama + `bge-m3`

| Dimension | Rating | Details |
|-----------|---------|---------|
| **Cost** | 🟢 FREE | No API cost (local inference) |
| **Latency** | 🟡 MEDIUM | ~300ms (local CPU) / ~80ms (local GPU) |
| **Offline Capability** | 🟢 FULL | Works completely offline |
| **Docker Compatibility** | 🟡 MEDIUM | Needs Ollama Docker image |
| **Local Development** | 🟢 EXCELLENT | Works offline, no API key |
| **CI Compatibility** | 🔴 HARD | Needs Ollama installed in CI |
| **Windows Support** | 🟡 MEDIUM | WSL2 required |
| **macOS Support** | 🟢 GOOD | Native macOS support |
| **Privacy** | 🟢 HIGH | Data never leaves local machine |
| **Retrieval Quality** | 🟢 EXCELLENT | MTEB rank: #12 (1024 dims) |
| **Scaling** | 🔴 HARD | Needs GPU for scaling |
| **Vector Dimensions** | 🟢 FIXED | 1024 |
| **Dependency Complexity** | 🟡 MEDIUM | Needs Ollama installed locally |

**Pros:**
- ✅ **FREE** (no API cost)
- ✅ **FULL OFFLINE** (works without internet)
- ✅ **HIGH PRIVACY** (data never leaves local machine)
- ✅ **EXCELLENT retrieval quality** (MTEB #12)

**Cons:**
- ❌ Higher latency (~300ms on CPU)
- ❌ Needs Ollama installed (WSL2 on Windows)
- ❌ CI compatibility hard (needs Ollama in CI)
- ❌ Larger model (requires more RAM)

**Best For:** Phase C (local embedding fallback, higher quality than `nomic-embed-text`)

---

### A.5 Cohere `embed-english-v3`

| Dimension | Rating | Details |
|-----------|---------|---------|
| **Cost** | 🟡 MEDIUM | $0.10 / 1M tokens (input) |
| **Latency** | 🟡 MEDIUM | ~80ms (US East) |
| **Offline Capability** | 🔴 NONE | Requires internet |
| **Docker Compatibility** | 🟢 GOOD | Just needs `COHERE_API_KEY` |
| **Local Development** | 🟡 MEDIUM | Requires API key + internet |
| **CI Compatibility** | 🟡 MEDIUM | Needs API key in CI secrets |
| **Windows Support** | 🟢 GOOD | Works via Node.js `cohere-ai` package |
| **macOS Support** | 🟢 GOOD | Works via Node.js `cohere-ai` package |
| **Privacy** | 🔴 LOW | Sends data to Cohere servers |
| **Retrieval Quality** | 🟢 EXCELLENT | MTEB rank: #3 (1024 dims) |
| **Scaling** | 🟢 EXCELLENT | Cohere handles scaling |
| **Vector Dimensions** | 🟢 FIXED | 1024 |
| **Dependency Complexity** | 🟢 LOW | Just `cohere-ai` npm package |

**Pros:**
- ✅ High retrieval quality (MTEB #3)
- ✅ Simple integration (just `cohere-ai` package)

**Cons:**
- ❌ Requires internet
- ❌ Privacy concerns
- ❌ Cost ($0.10 / 1M tokens)
- ❌ **WORSE than OpenAI** (higher cost, lower quality)

**Best For:** Not recommended (OpenAI is better + cheaper)

---

### A.6 Hybrid Strategy (RECOMMENDED)

**Strategy:** Combine multiple embedding providers with routing logic.

**Routing Logic:**
1. **Local first:** Try Ollama (if available + offline)
2. **Cloud fallback:** If Ollama fails → use OpenAI
3. **Cache priority:** Check cache before generating embedding

**Pros:**
- ✅ **Best of both worlds** (offline + high quality)
- ✅ **Cost optimization** (use local when possible)
- ✅ **Privacy** (local first, cloud fallback)
- ✅ **Reliability** (fallback if one fails)

**Cons:**
- ❌ **Higher complexity** (needs routing logic)
- ❌ **More dependencies** (Ollama + OpenAI)
- ❌ **Needs synchronization** (cache + routing)

**Best For:** Phase D (hybrid routing)

---

## B. Current Project Constraints Analysis

### B.1 PartyGameSDK is Local Development First

**Constraint:** PartyGameSDK targets local development (Unity WebGL, local server, local screen).

**Implication:**
- ❌ **Cloud-only embedding (OpenAI/Cohere) is problematic** (requires internet)
- ✅ **Local embedding (Ollama) is preferred** (works offline)

**Decision:** Phase C MUST implement local embedding fallback.

---

### B.2 QClaw/Codex Often Offline

**Constraint:** QClaw/Codex agents often work offline (no internet).

**Implication:**
- ❌ **Cloud-only embedding (OpenAI/Cohere) will FAIL** when offline
- ✅ **Local embedding (Ollama) is REQUIRED** for offline work

**Decision:** Phase C MUST implement local embedding fallback.

---

### B.3 Windows + macOS Dual Environment

**Constraint:** PartyGameSDK supports Windows + macOS (Unity WebGL builds).

**Implication:**
- ❌ **Ollama on Windows requires WSL2** (not native)
- ❌ **Docker/WSL already blocker** (complex setup)
- ✅ **OpenAI works on both** (just Node.js package)

**Decision:**
- Phase B: Use OpenAI (simple, works on both)
- Phase C: Use Ollama (acceptable complexity for offline)

---

### B.4 Docker/WSL Already Blocker

**Constraint:** Docker/WSL setup is already a blocker for some developers.

**Implication:**
- ❌ **Adding Ollama dependency increases blocker** (needs WSL2 on Windows)
- ✅ **OpenAI has NO Docker/WSL dependency** (just API key)

**Decision:**
- Phase B: Use OpenAI (no Docker/WSL dependency)
- Phase C: Document Ollama installation (WSL2 on Windows)

---

### B.5 Token Cost Agent Not Implemented Yet

**Constraint:** Token Cost Agent (tracking + budgeting) is NOT implemented yet.

**Implication:**
- ❌ **OpenAI embedding cost is UNTRACKED** (no budgeting)
- ⚠️ **Risk of cost overrun** (if many embeddings generated)

**Decision:**
- Phase B: Use OpenAI (accept cost risk, track manually)
- Phase C: Implement Token Cost Agent (track embedding cost)

---

### B.6 Current Retrieval Docs Only ~76 Files

**Constraint:** Current RAG retrieval only has ~76 files (small corpus).

**Implication:**
- ✅ **OpenAI cost is LOW** ($0.02/1M tokens × ~76 files = ~$0.01)
- ✅ **Ollama latency is ACCEPTABLE** (768 dims, small corpus)

**Decision:**
- Phase B: Use OpenAI (low cost, high quality)
- Phase C: Use Ollama (free, acceptable latency for small corpus)

---

### B.7 Target is Agent Runtime, Not SaaS RAG

**Constraint:** PartyGameSDK target is Agent Runtime (local agents), NOT SaaS RAG (cloud service).

**Implication:**
- ✅ **Local embedding is PREFERRED** (agents work locally)
- ❌ **Cloud embedding is ACCEPTABLE** (for high quality)

**Decision:**
- Phase B: Use OpenAI (high quality, acceptable for Agent Runtime)
- Phase C: Use Ollama (local, preferred for Agent Runtime)

---

## C. Recommended Solution (Multi-Phase Approach)

### C.1 Phase B: OpenAI Embedding (Quick Validation)

**Objective:** Quickly validate retrieval quality using OpenAI `text-embedding-3-small`.

**Embedding Provider:** OpenAI `text-embedding-3-small`

**Why:**
1. ✅ High retrieval quality (MTEB #1)
2. ✅ Low latency (~50ms)
3. ✅ Simple integration (just `openai` package)
4. ✅ Low cost for ~76 files (~$0.01)

**Tasks:**
1. Install `openai` package
2. Create `agents/rag-memory/embedder.js`
3. Generate embeddings for ~76 files
4. Store embeddings in PostgreSQL (pgvector)
5. Run evaluation (`evaluate_retrieval.js`)
6. Check if metrics meet Phase B.1 success criteria

**Success Criteria:**
- Recall@5 ≥ 0.6000
- MRR ≥ 0.4500
- must_not_suggest violations = 0

**If FAILED:** Proceed to Phase C (local embedding fallback)

**If PASSED:** Proceed to Phase C (local embedding fallback) + Phase D (hybrid routing)

---

### C.2 Phase C: Local Embedding Fallback (Ollama)

**Objective:** Implement local embedding fallback using Ollama + `nomic-embed-text`.

**Embedding Provider:** Ollama + `nomic-embed-text`

**Why:**
1. ✅ **FREE** (no API cost)
2. ✅ **FULL OFFLINE** (works without internet)
3. ✅ **HIGH PRIVACY** (data never leaves local machine)
4. ✅ Acceptable retrieval quality (MTEB #42)

**Tasks:**
1. Install Ollama (macOS: `brew install ollama`; Windows: WSL2)
2. Pull `nomic-embed-text` model: `ollama pull nomic-embed-text`
3. Create `agents/rag-memory/embedding-providers/ollama-provider.js`
4. Implement `EmbeddingProvider` interface
5. Modify `embedder.js` to support multiple providers
6. Run evaluation (`evaluate_retrieval.js`)
7. Compare metrics: OpenAI vs. Ollama

**Success Criteria:**
- Recall@5 ≥ 0.5000 (lower than OpenAI, acceptable)
- MRR ≥ 0.3500 (lower than OpenAI, acceptable)
- must_not_suggest violations = 0
- Works OFFLINE (no internet)

**If FAILED:** Try `bge-m3` (higher quality, slower)

**If PASSED:** Proceed to Phase D (hybrid routing)

---

### C.3 Phase D: Hybrid Routing

**Objective:** Implement hybrid routing (local first, cloud fallback, cache priority).

**Routing Logic:**
1. **Local first:** Try Ollama (if available + offline)
2. **Cloud fallback:** If Ollama fails → use OpenAI
3. **Cache priority:** Check cache before generating embedding

**Why:**
1. ✅ **Best of both worlds** (offline + high quality)
2. ✅ **Cost optimization** (use local when possible)
3. ✅ **Privacy** (local first, cloud fallback)
4. ✅ **Reliability** (fallback if one fails)

**Tasks:**
1. Create `agents/rag-memory/embedding-providers/hybrid-provider.js`
2. Implement routing logic:
   - Check Ollama availability (localhost:11434)
   - If Ollama available → use Ollama
   - If Ollama fails → fallback to OpenAI
   - Check cache before generating embedding
3. Implement cache (Redis or in-memory)
4. Modify `embedder.js` to use hybrid provider
5. Run evaluation (`evaluate_retrieval.js`)
6. Benchmark: latency, cost, retrieval quality

**Success Criteria:**
- Recall@5 ≥ 0.6000 (use OpenAI when needed)
- MRR ≥ 0.4500 (use OpenAI when needed)
- must_not_suggest violations = 0
- Works OFFLINE (Ollama fallback)
- Cost OPTIMIZED (use local when possible)

**If FAILED:** Adjust routing logic (more aggressive caching, better fallback)

**If PASSED:** ✅ **FINAL SOLUTION** (hybrid routing)

---

## D. Implementation Plan

### D.1 Phase B (OpenAI Embedding)

**Branch:** `platform/v1.2.0-phase-b-embedding`

**Files to Create/Modify:**
1. `agents/rag-memory/package.json` (add `openai` dependency)
2. `agents/rag-memory/embedder.js` (OpenAI embedding generation)
3. `agents/rag-memory/vector_store.js` (pgvector storage)
4. `agents/rag-memory/query_vector.js` (cosine similarity search)

**Dependencies:**
- `openai` (^4.77.0)
- `pg` (^8.11.3)
- `dotenv` (^16.4.5)

**Environment Variables:**
```
OPENAI_API_KEY=<set-in-shell-only>
RAG_EMBEDDING_MODEL=text-embedding-3-small
RAG_VECTOR_DIMENSIONS=1536
```

**Estimated Time:** 2-4 hours

---

### D.2 Phase C (Local Embedding Fallback)

**Branch:** `platform/v1.2.0-phase-c-local-embedding`

**Files to Create/Modify:**
1. `agents/rag-memory/embedding-providers/ollama-provider.js` (Ollama provider)
2. `agents/rag-memory/embedder.js` (modify to support multiple providers)
3. `docs/OLLAMA_SETUP.md` (Ollama installation guide)

**Dependencies:**
- `ollama` (Node.js package, optional)
- Ollama installed locally (macOS/Windows/WSL2)

**Environment Variables:**
```
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=nomic-embed-text
```

**Estimated Time:** 4-8 hours (including Ollama setup)

---

### D.3 Phase D (Hybrid Routing)

**Branch:** `platform/v1.2.0-phase-d-hybrid-routing`

**Files to Create/Modify:**
1. `agents/rag-memory/embedding-providers/hybrid-provider.js` (hybrid routing)
2. `agents/rag-memory/embedding-providers/cache.js` (embedding cache)
3. `agents/rag-memory/embedder.js` (modify to use hybrid provider)

**Dependencies:**
- `ioredis` (optional, for Redis cache)
- `openai` (^4.77.0)
- `ollama` (optional)

**Environment Variables:**
```
RAG_EMBEDDING_PROVIDER=hybrid
REDIS_URL=redis://localhost:6379
```

**Estimated Time:** 8-12 hours

---

## E. Risk Assessment

### E.1 OpenAI API Key Leak

**Risk:** OpenAI API key leaked (committed to Git).

**Mitigation:**
1. ✅ `check-no-secrets.js` detects `sk-...` patterns
2. ✅ `.env` MUST be in `.gitignore`
3. ✅ Use shell-only API key (`export OPENAI_API_KEY="..."`)

---

### E.2 Ollama Not Available on Windows

**Risk:** Ollama requires WSL2 on Windows (complex setup).

**Mitigation:**
1. ✅ Document Ollama installation (WSL2 on Windows)
2. ✅ Provide Docker alternative (`docker run ollama/ollama`)
3. ✅ Fallback to OpenAI if Ollama not available

---

### E.3 Embedding Dimensions Mismatch

**Risk:** OpenAI (1536 dims) vs. Ollama (768 dims) → cannot mix in same pgvector table.

**Mitigation:**
1. ✅ Use SEPARATE tables for different providers
2. ✅ Or, use SAME dimensions (configure OpenAI to 768 dims)
3. ✅ Or, use hybrid search (keyword + embedding)

---

### E.4 Cost Overrun (OpenAI)

**Risk:** Too many embeddings generated → high cost.

**Mitigation:**
1. ✅ Implement caching (avoid re-generating embeddings)
2. ✅ Implement Token Cost Agent (track + budget)
3. ✅ Use local embedding when possible (Phase C)

---

## F. Decision Record

**Decision:** Multi-phase approach (Phase B → Phase C → Phase D)

**Rationale:**
1. PartyGameSDK is **local development first**
2. QClaw/Codex **often offline**
3. Windows + macOS **dual environment**
4. Docker/WSL **already blocker**
5. Current retrieval docs **only ~76 files**
6. Target is **Agent Runtime**, not SaaS RAG

**Next Action:** Implement Phase B (OpenAI embedding) → validate retrieval quality → proceed to Phase C (local fallback) → proceed to Phase D (hybrid routing).

---

**End of Embedding Architecture Decision**
