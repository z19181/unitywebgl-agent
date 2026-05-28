# RAG Retrieval Evaluation Results

**Generated:** 2026-05-26T03:25:15.001Z
**Test Queries:** 20
**Categories:** hard_constraints, material_policy, git_governance, release_gate, dashboard, rag_memory, token_cost, canary_pipeline, unity_webgl, agent_runtime

## Summary Metrics

| Metric | Value |
|--------|-------|
| **Recall@5** | **0.1000** |
| **Precision@5** | **0.0300** |
| **MRR** | **0.0350** |
| **NDCG@5** | **0.0457** |
| **must_not_suggest Violations** | **4** |

## Per-Query Results

### Q001: "hard constraints server.js"
- **Category:** hard_constraints
- **Recall@5:** 0.5000 (1/2)
- **Precision@5:** 0.2000
- **MRR:** 0.2500
- **NDCG@5:** 0.2641
- **Violations:** 2
  - **Details:**
    - Phrase: "modify server.js"
      File: `docs/V1_2_0_PHASE_A2_FINAL_SUMMARY.md`
      Snippet: "v1.2.0 Phase A.2 Final Summary
4. must_not_suggest Violation Analysis
4.1 Violation Details

## v1.2..."
    - Phrase: "modify server.js"
      File: `docs/V1_2_0_RAG_MEMORY_PHASE_A2_KEYWORD_IMPROVEMENT_REPORT.md`
      Snippet: "v1.2.0 Phase A.2 — Keyword Retrieval Improvement Report
4. Metrics Comparison
4.3 must_not_suggest V..."

**Top-5 Results:**
  1. `docs/V1_2_0_RAG_MEMORY_PHASE_A1_EVAL_REPORT.md` (score: 1.0976, relevant: ❌)
  2. `docs/V1_2_0_PHASE_A2_FINAL_SUMMARY.md` (score: 0.9030, relevant: ❌)
  3. `docs/V1_2_0_RAG_MEMORY_PHASE_A2_KEYWORD_IMPROVEMENT_REPORT.md` (score: 0.8629, relevant: ❌)
  4. `docs/V1_1_4_STATE_SNAPSHOT.md` (score: 0.8387, relevant: ✅)
  5. `docs/V1_2_0_PHASE_B0_ENV_PREP_REPORT.md` (score: 0.8184, relevant: ❌)

---

### Q002: "Unity WebGL material policy"
- **Category:** material_policy
- **Recall@5:** 0.0000 (0/2)
- **Precision@5:** 0.0000
- **MRR:** 0.0000
- **NDCG@5:** 0.0000
- **Violations:** 0

**Top-5 Results:**
  1. `docs/V1_2_0_RAG_MEMORY_PHASE_A1_EVAL_REPORT.md` (score: 0.8071, relevant: ❌)
  2. `UnityExamples/JumpJumpTemplateDemo/BUILD_GUIDE.md` (score: 0.6265, relevant: ❌)
  3. `UnityExamples/_RuntimeVerifiedTemplate/BUILD_GUIDE.md` (score: 0.6265, relevant: ❌)
  4. `docs/STASH_VALIDATION_REPORT.md` (score: 0.6257, relevant: ❌)
  5. `UnityExamples/UNITY_AI_OPTIONAL_WORKFLOW.md` (score: 0.6071, relevant: ❌)

---

### Q003: "stash validation report"
- **Category:** git_governance
- **Recall@5:** 0.0000 (0/1)
- **Precision@5:** 0.0000
- **MRR:** 0.0000
- **NDCG@5:** 0.0000
- **Violations:** 0

**Top-5 Results:**
  1. `docs/RUNTIME_AUTOMATION_PHASE_REPORT.md` (score: 0.5104, relevant: ❌)
  2. `docs/V1_2_0_RAG_MEMORY_PHASE_A1_EVAL_REPORT.md` (score: 0.4935, relevant: ❌)
  3. `docs/AGENT_DASHBOARD_PHASE_REPORT.md` (score: 0.4839, relevant: ❌)
  4. `docs/V1_2_0_PHASE_B_DEPENDENCY_PLAN.md` (score: 0.4821, relevant: ❌)
  5. `docs/V1_1_4_STATE_SNAPSHOT.md` (score: 0.4146, relevant: ❌)

---

### Q004: "release gate process"
- **Category:** release_gate
- **Recall@5:** 0.0000 (0/2)
- **Precision@5:** 0.0000
- **MRR:** 0.0000
- **NDCG@5:** 0.0000
- **Violations:** 0

**Top-5 Results:**
  1. `docs/templates/RELEASE_GATE_REPORT_TEMPLATE.md` (score: 0.8289, relevant: ❌)
  2. `docs/V1_2_0_RAG_MEMORY_PHASE_A1_EVAL_REPORT.md` (score: 0.8010, relevant: ❌)
  3. `docs/AGENT_DASHBOARD_PHASE_REPORT.md` (score: 0.6207, relevant: ❌)
  4. `docs/V1_0_0_TAG_APPROVAL.md` (score: 0.5654, relevant: ❌)
  5. `agents/model-router/SOUL.md` (score: 0.5575, relevant: ❌)

---

### Q005: "Agent Dashboard Next.js shadcn/ui"
- **Category:** dashboard
- **Recall@5:** 0.0000 (0/2)
- **Precision@5:** 0.0000
- **MRR:** 0.0000
- **NDCG@5:** 0.0000
- **Violations:** 0

**Top-5 Results:**
  1. `docs/V1_2_0_RAG_MEMORY_PHASE_A_REPORT.md` (score: 0.6442, relevant: ❌)
  2. `agents/rag-memory/RAG_RETRIEVAL_POLICY.md` (score: 0.3779, relevant: ❌)

---

### Q006: "RAG memory retrieval policy"
- **Category:** rag_memory
- **Recall@5:** 0.0000 (0/1)
- **Precision@5:** 0.0000
- **MRR:** 0.0000
- **NDCG@5:** 0.0000
- **Violations:** 0

**Top-5 Results:**

---

### Q007: "token cost analysis Agent Intelligence"
- **Category:** token_cost
- **Recall@5:** 0.0000 (0/1)
- **Precision@5:** 0.0000
- **MRR:** 0.0000
- **NDCG@5:** 0.0000
- **Violations:** 0

**Top-5 Results:**
  1. `docs/STASH_VALIDATION_REPORT.md` (score: 0.5064, relevant: ❌)
  2. `docs/EMBEDDING_SECURITY_CONSTRAINTS.md` (score: 0.2994, relevant: ❌)
  3. `docs/V1_2_0_PHASE_B_DEPENDENCY_PLAN.md` (score: 0.2692, relevant: ❌)
  4. `docs/V1_2_0_PHASE_B_ENV_SETUP.md` (score: 0.2685, relevant: ❌)

---

### Q008: "canary deployment pipeline v0.4.0"
- **Category:** canary_pipeline
- **Recall@5:** 0.5000 (1/2)
- **Precision@5:** 0.2000
- **MRR:** 0.2500
- **NDCG@5:** 0.2641
- **Violations:** 0

**Top-5 Results:**
  1. `docs/GOVERNANCE_LAYER_REPORT.md` (score: 0.7497, relevant: ❌)
  2. `docs/DEPLOYMENT_CHECKLIST.md` (score: 0.6566, relevant: ❌)
  3. `UnityExamples/WEBGL_RUNTIME_PIPELINE.md` (score: 0.6432, relevant: ❌)
  4. `docs/V1_1_4_STATE_SNAPSHOT.md` (score: 0.6322, relevant: ✅)
  5. `docs/QA_PHASE1_LOG.md` (score: 0.5756, relevant: ❌)

---

### Q009: "Unity WebGL build verification 26 checks"
- **Category:** unity_webgl
- **Recall@5:** 0.0000 (0/2)
- **Precision@5:** 0.0000
- **MRR:** 0.0000
- **NDCG@5:** 0.0000
- **Violations:** 0

**Top-5 Results:**
  1. `UnityExamples/RUNTIME_VERIFIED_TEMPLATE_REPORT.md` (score: 0.9867, relevant: ❌)
  2. `docs/AGENT_DASHBOARD_PHASE_REPORT.md` (score: 0.8734, relevant: ❌)
  3. `UnityExamples/UNITY_AI_OPTIONAL_WORKFLOW.md` (score: 0.7123, relevant: ❌)
  4. `docs/PRODUCTION_RELEASE_REPORT.md` (score: 0.6600, relevant: ❌)
  5. `docs/MANUAL_DEVICE_QA_CHECKLIST.md` (score: 0.5781, relevant: ❌)

---

### Q010: "Five Iron Laws PartyGameSDK"
- **Category:** hard_constraints
- **Recall@5:** 0.0000 (0/2)
- **Precision@5:** 0.0000
- **MRR:** 0.0000
- **NDCG@5:** 0.0000
- **Violations:** 0

**Top-5 Results:**
  1. `UnityExamples/_RuntimeVerifiedTemplate/BUILD_GUIDE.md` (score: 0.6430, relevant: ❌)
  2. `UnityExamples/JumpJumpTemplateDemo/BUILD_GUIDE.md` (score: 0.6430, relevant: ❌)
  3. `UnityExamples/_GameTemplateSkeleton/GAME_SPEC.md` (score: 0.5604, relevant: ❌)
  4. `UnityExamples/_GameTemplateSkeleton/BUILD_GUIDE.md` (score: 0.5307, relevant: ❌)
  5. `UnityExamples/SnakeTemplateDemo/BUILD_GUIDE.md` (score: 0.5030, relevant: ❌)

---

### Q011: "agent runtime architecture v1.1.2"
- **Category:** agent_runtime
- **Recall@5:** 1.0000 (1/1)
- **Precision@5:** 0.2000
- **MRR:** 0.2000
- **NDCG@5:** 0.3869
- **Violations:** 0

**Top-5 Results:**
  1. `docs/AGENT_DASHBOARD_PHASE_REPORT.md` (score: 0.9909, relevant: ❌)
  2. `docs/AGENT_INTELLIGENCE_LAYER_REPORT.md` (score: 0.9263, relevant: ❌)
  3. `docs/V1_2_0_EMBEDDING_ARCHITECTURE_DECISION.md` (score: 0.8880, relevant: ❌)
  4. `docs/WORKFLOW_COMMANDS.md` (score: 0.8760, relevant: ❌)
  5. `docs/V1_1_4_STATE_SNAPSHOT.md` (score: 0.8434, relevant: ✅)

---

### Q012: "Git workflow rebase force push SSH key"
- **Category:** git_governance
- **Recall@5:** 0.0000 (0/2)
- **Precision@5:** 0.0000
- **MRR:** 0.0000
- **NDCG@5:** 0.0000
- **Violations:** 0

**Top-5 Results:**
  1. `docs/V1_2_0_EMBEDDING_ARCHITECTURE_DECISION.md` (score: 0.6796, relevant: ❌)
  2. `docs/RUNTIME_AUTOMATION_PHASE_REPORT.md` (score: 0.6612, relevant: ❌)
  3. `docs/V1_2_0_PHASE_B_DEPENDENCY_PLAN.md` (score: 0.6417, relevant: ❌)
  4. `docs/V1_2_0_RAG_MEMORY_PHASE_A1_EVAL_REPORT.md` (score: 0.5310, relevant: ❌)
  5. `docs/V1_1_4_STATE_SNAPSHOT.md` (score: 0.4597, relevant: ❌)

---

### Q013: "Unity WebGL runtime pipeline WEBGL_RUNTIME_PIPELINE"
- **Category:** unity_webgl
- **Recall@5:** 0.0000 (0/1)
- **Precision@5:** 0.0000
- **MRR:** 0.0000
- **NDCG@5:** 0.0000
- **Violations:** 0

**Top-5 Results:**
  1. `UnityExamples/RUNTIME_VERIFIED_TEMPLATE_REPORT.md` (score: 1.2034, relevant: ❌)
  2. `docs/templates/UNITY_BUILD_REPORT_TEMPLATE.md` (score: 1.1890, relevant: ❌)
  3. `docs/WEBGL_RUNTIME_AUTOMATION_PLAN.md` (score: 1.1455, relevant: ❌)
  4. `UnityExamples/JumpJumpTemplateDemo/WEBGL_BUILD_VALIDATION_REPORT.md` (score: 0.8927, relevant: ❌)
  5. `UnityExamples/_RuntimeVerifiedTemplate/WEBGL_BUILD_VALIDATION_REPORT.md` (score: 0.8927, relevant: ❌)

---

### Q014: "Material Policy URP Lit SimpleLit Unlit"
- **Category:** material_policy
- **Recall@5:** 0.0000 (0/1)
- **Precision@5:** 0.0000
- **MRR:** 0.0000
- **NDCG@5:** 0.0000
- **Violations:** 0

**Top-5 Results:**
  1. `UnityExamples/_RuntimeVerifiedTemplate/BUILD_GUIDE.md` (score: 0.6615, relevant: ❌)
  2. `UnityExamples/JumpJumpTemplateDemo/BUILD_GUIDE.md` (score: 0.6615, relevant: ❌)
  3. `UnityExamples/_GameTemplateSkeleton/BUILD_GUIDE.md` (score: 0.6201, relevant: ❌)
  4. `UnityExamples/SnakeTemplateDemo/BUILD_GUIDE.md` (score: 0.6011, relevant: ❌)
  5. `UnityExamples/_GameTemplateSkeleton/GAME_SPEC.md` (score: 0.5663, relevant: ❌)

---

### Q015: "QClaw review prompt template"
- **Category:** rag_memory
- **Recall@5:** 0.0000 (0/1)
- **Precision@5:** 0.0000
- **MRR:** 0.0000
- **NDCG@5:** 0.0000
- **Violations:** 0

**Top-5 Results:**
  1. `docs/V1_2_0_PHASE_B0_ENV_PREP_REPORT.md` (score: 0.5636, relevant: ❌)
  2. `docs/V1_2_0_PHASE_A2_FINAL_SUMMARY.md` (score: 0.5370, relevant: ❌)
  3. `docs/V1_2_0_RAG_MEMORY_PHASE_A1_EVAL_REPORT.md` (score: 0.5267, relevant: ❌)
  4. `docs/AGENT_DASHBOARD_PHASE_REPORT.md` (score: 0.5246, relevant: ❌)
  5. `docs/AGENT_STUDIO_HIERARCHY.md` (score: 0.4810, relevant: ❌)

---

### Q016: "Codex task decomposition prompt"
- **Category:** rag_memory
- **Recall@5:** 0.0000 (0/1)
- **Precision@5:** 0.0000
- **MRR:** 0.0000
- **NDCG@5:** 0.0000
- **Violations:** 0

**Top-5 Results:**
  1. `agents/model-router/SOUL.md` (score: 0.6122, relevant: ❌)
  2. `docs/V1_2_0_PHASE_B0_ENV_PREP_REPORT.md` (score: 0.5402, relevant: ❌)
  3. `UnityExamples/UNITY_WEBGL_REAL_BUILD_GATE.md` (score: 0.4921, relevant: ❌)
  4. `docs/templates/HOTFIX_REPORT_TEMPLATE.md` (score: 0.4823, relevant: ❌)
  5. `docs/RUNTIME_AUTOMATION_PHASE_REPORT.md` (score: 0.4713, relevant: ❌)

---

### Q017: "Prometheus metrics Grafana dashboard Agent Dashboard"
- **Category:** dashboard
- **Recall@5:** 0.0000 (0/1)
- **Precision@5:** 0.0000
- **MRR:** 0.0000
- **NDCG@5:** 0.0000
- **Violations:** 0

**Top-5 Results:**
  1. `docs/AGENT_STUDIO_HIERARCHY.md` (score: 1.2676, relevant: ❌)
  2. `docs/V1_2_0_RAG_MEMORY_PHASE_A_REPORT.md` (score: 0.8279, relevant: ❌)
  3. `docs/AGENT_DASHBOARD_PLAN.md` (score: 0.7955, relevant: ❌)
  4. `docs/V1_2_0_RAG_MEMORY_PHASE_A1_EVAL_REPORT.md` (score: 0.7586, relevant: ❌)
  5. `docs/V1_2_0_PHASE_A2_FINAL_SUMMARY.md` (score: 0.5953, relevant: ❌)

---

### Q018: "PostgreSQL pgvector RAG Memory v1.2.0 Phase B"
- **Category:** rag_memory
- **Recall@5:** 0.0000 (0/1)
- **Precision@5:** 0.0000
- **MRR:** 0.0000
- **NDCG@5:** 0.0000
- **Violations:** 0

**Top-5 Results:**
  1. `docs/V1_2_0_RAG_MEMORY_PHASE_A2_KEYWORD_IMPROVEMENT_REPORT.md` (score: 1.3504, relevant: ❌)
  2. `docs/V1_2_0_PHASE_B_ENV_SETUP.md` (score: 1.1564, relevant: ❌)
  3. `docs/V1_2_0_RAG_MEMORY_PHASE_A1_EVAL_REPORT.md` (score: 1.1470, relevant: ❌)
  4. `docs/V1_2_0_EMBEDDING_ARCHITECTURE_DECISION.md` (score: 1.0857, relevant: ❌)
  5. `docs/V1_1_4_STATE_SNAPSHOT.md` (score: 1.0370, relevant: ❌)

---

### Q019: "Unity WebGL baseline v0.1.0 PartyGameSDK"
- **Category:** unity_webgl
- **Recall@5:** 0.0000 (0/2)
- **Precision@5:** 0.0000
- **MRR:** 0.0000
- **NDCG@5:** 0.0000
- **Violations:** 0

**Top-5 Results:**
  1. `CHANGELOG.md` (score: 0.9173, relevant: ❌)
  2. `UnityExamples/MULTI_GAME_WEBGL_BUILD_REPORT.md` (score: 0.7624, relevant: ❌)
  3. `docs/V1_2_0_EMBEDDING_ARCHITECTURE_DECISION.md` (score: 0.7109, relevant: ❌)
  4. `docs/PATH_SCOPED_RULES.md` (score: 0.6593, relevant: ❌)
  5. `docs/RUNTIME_ARTIFACT_POLICY.md` (score: 0.6529, relevant: ❌)

---

### Q020: "server.js injection playerIndex PartyGameSDK protocol"
- **Category:** hard_constraints
- **Recall@5:** 0.0000 (0/2)
- **Precision@5:** 0.0000
- **MRR:** 0.0000
- **NDCG@5:** 0.0000
- **Violations:** 2
  - **Details:**
    - Phrase: "modify server.js"
      File: `docs/V1_2_0_PHASE_A2_FINAL_SUMMARY.md`
      Snippet: "v1.2.0 Phase A.2 Final Summary
6. Why Embedding Retrieval is Necessary
6.3 Embedding Retrieval Can F..."
    - Phrase: "modify server.js"
      File: `docs/V1_2_0_RAG_MEMORY_PHASE_A1_EVAL_REPORT.md`
      Snippet: "v1.2.0 Phase A.1 — RAG Evaluation Harness Report
5. Current Weaknesses
5.4 must_not_suggest Uses Sub..."

**Top-5 Results:**
  1. `docs/PATH_SCOPED_RULES.md` (score: 0.9337, relevant: ❌)
  2. `agents/rag-memory/RAG_RETRIEVAL_POLICY.md` (score: 0.9088, relevant: ❌)
  3. `docs/V1_2_0_RAG_MEMORY_PHASE_A2_KEYWORD_IMPROVEMENT_REPORT.md` (score: 0.8283, relevant: ❌)
  4. `docs/V1_2_0_PHASE_A2_FINAL_SUMMARY.md` (score: 0.7041, relevant: ❌)
  5. `docs/V1_2_0_RAG_MEMORY_PHASE_A1_EVAL_REPORT.md` (score: 0.7033, relevant: ❌)

---

## Violations Summary

| Query | Phrase | File |
|--------|---------|------|
| Q001 | "modify server.js" | `docs/V1_2_0_PHASE_A2_FINAL_SUMMARY.md` |
| Q001 | "modify server.js" | `docs/V1_2_0_RAG_MEMORY_PHASE_A2_KEYWORD_IMPROVEMENT_REPORT.md` |
| Q020 | "modify server.js" | `docs/V1_2_0_PHASE_A2_FINAL_SUMMARY.md` |
| Q020 | "modify server.js" | `docs/V1_2_0_RAG_MEMORY_PHASE_A1_EVAL_REPORT.md` |

## Phase B Admission Criteria

To admit Phase B (Embedding + pgvector), the following criteria MUST be met:

1. **Recall@5 >= baseline** (current keyword retrieval)
2. **MRR > baseline**
3. **must_not_suggest violations = 0**
4. **Precision@5 > baseline** (optional, but recommended)
5. **NDCG@5 > baseline** (optional, but recommended)

**Current Baseline:**
- Recall@5 = 0.1000
- Precision@5 = 0.0300
- MRR = 0.0350
- NDCG@5 = 0.0457
- must_not_suggest violations = 4

**Phase B is allowed ONLY if all criteria are met.**