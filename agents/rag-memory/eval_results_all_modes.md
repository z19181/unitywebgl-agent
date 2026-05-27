# RAG Retrieval Evaluation Report

Generated: 2026-05-27T03:47:12.181Z

## Summary

| Mode | Recall@5 | Precision@5 | MRR | NDCG@5 | Violations |
|------|----------|-------------|-----|--------|------------|
| keyword | 0.4250 | 0.1100 | 0.2896 | 0.2807 | 1 |
| semantic | 0.2250 | 0.1400 | 0.1992 | 0.1641 | 0 |
| hybrid | 0.5250 | 0.1400 | 0.4804 | 0.4466 | 0 |

## Per-Query Details

### KEYWORD

**[✅] Q001: hard constraints server.js** (R@5=0.50, MRR=1.0000)
- Expected: docs/V1_1_4_STATE_SNAPSHOT.md, agents/rag-memory/RAG_RETRIEVAL_POLICY.md
- Violations: 0
- Top 5:
  - docs/V1_1_4_STATE_SNAPSHOT.md (score: 1.0000)
  - docs/V1_2_0_EMBEDDING_ARCHITECTURE_DECISION.md (score: 1.0000)
  - docs/V1_2_0_PHASE_A2_FINAL_SUMMARY.md (score: 1.0000)
  - docs/V1_2_0_PHASE_B0_ENV_PREP_REPORT.md (score: 1.0000)
  - docs/V1_2_0_PHASE_B2_CHUNK_RECONSTRUCTION_REPORT.md (score: 1.0000)

**[✅] Q002: Unity WebGL material policy** (R@5=0.50, MRR=0.3333)
- Expected: UnityExamples/UNITY_WEBGL_MATERIAL_POLICY.md, docs/V1_1_4_STATE_SNAPSHOT.md
- Violations: 0
- Top 5:
  - docs/AGENT_INTELLIGENCE_LAYER_REPORT.md (score: 1.0000)
  - docs/RUNTIME_AUTOMATION_PHASE_REPORT.md (score: 1.0000)
  - docs/V1_1_4_STATE_SNAPSHOT.md (score: 1.0000)
  - docs/V1_2_0_PHASE_B2_CHUNK_RECONSTRUCTION_REPORT.md (score: 1.0000)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A1_EVAL_REPORT.md (score: 1.0000)

**[✅] Q003: stash validation report** (R@5=1.00, MRR=1.0000)
- Expected: docs/STASH_VALIDATION_REPORT.md
- Violations: 0
- Top 5:
  - docs/STASH_VALIDATION_REPORT.md (score: 1.0000)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A1_EVAL_REPORT.md (score: 1.0000)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A2_KEYWORD_IMPROVEMENT_REPORT.md (score: 1.0000)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A_REPORT.md (score: 1.0000)
  - UnityExamples/_RuntimeVerifiedTemplate/WEBGL_BUILD_VALIDATION_REPORT.md (score: 1.0000)

**[❌] Q004: release gate process** (R@5=0.00, MRR=0.1250)
- Expected: prompts/release_gate.prompt.md, docs/V1_1_4_STATE_SNAPSHOT.md
- Violations: 0
- Top 5:
  - docs/AGENT_DASHBOARD_PHASE_REPORT.md (score: 1.0000)
  - docs/AGENT_DASHBOARD_PLAN.md (score: 1.0000)
  - docs/V1_2_0_PHASE_A2_FINAL_SUMMARY.md (score: 1.0000)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A1_EVAL_REPORT.md (score: 1.0000)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A_REPORT.md (score: 1.0000)

**[✅] Q005: Agent Dashboard Next.js shadcn/ui** (R@5=0.50, MRR=0.2500)
- Expected: agent-dashboard/README.md, docs/V1_1_4_STATE_SNAPSHOT.md
- Violations: 0
- Top 5:
  - docs/AGENT_DASHBOARD_PHASE_REPORT.md (score: 1.0000)
  - docs/AGENT_DASHBOARD_PLAN.md (score: 1.0000)
  - docs/AGENT_INTELLIGENCE_LAYER_REPORT.md (score: 1.0000)
  - docs/V1_1_4_STATE_SNAPSHOT.md (score: 1.0000)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A1_EVAL_REPORT.md (score: 1.0000)

**[❌] Q006: RAG memory retrieval policy** (R@5=0.00, MRR=0.0000)
- Expected: agents/rag-memory/RAG_RETRIEVAL_POLICY.md
- Violations: 0
- Top 5:
  - docs/AGENT_INTELLIGENCE_LAYER_REPORT.md (score: 1.0000)
  - docs/RAG_RETRIEVAL_POLICY.md (score: 1.0000)
  - docs/V1_1_4_STATE_SNAPSHOT.md (score: 1.0000)
  - docs/V1_2_0_PHASE_A2_FINAL_SUMMARY.md (score: 1.0000)
  - docs/V1_2_0_PHASE_B0_ENV_PREP_REPORT.md (score: 1.0000)

**[✅] Q007: token cost analysis Agent Intelligence** (R@5=1.00, MRR=0.2000)
- Expected: docs/V1_1_4_STATE_SNAPSHOT.md
- Violations: 0
- Top 5:
  - docs/AGENT_DASHBOARD_PHASE_REPORT.md (score: 1.0000)
  - docs/AGENT_DASHBOARD_PLAN.md (score: 1.0000)
  - docs/AGENT_INTELLIGENCE_LAYER_REPORT.md (score: 1.0000)
  - docs/AGENT_STUDIO_HIERARCHY.md (score: 1.0000)
  - docs/V1_1_4_STATE_SNAPSHOT.md (score: 1.0000)

**[✅] Q008: canary deployment pipeline v0.4.0** (R@5=0.50, MRR=0.2000)
- Expected: docs/V1_1_4_STATE_SNAPSHOT.md, docs/V1_1_4_RUNTIME_SANITY_REPORT.md
- Violations: 0
- Top 5:
  - docs/V1_2_0_RAG_MEMORY_PHASE_A2_KEYWORD_IMPROVEMENT_REPORT.md (score: 0.9473)
  - docs/V1_0_0_RELEASE_SUMMARY.md (score: 0.9040)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A1_EVAL_REPORT.md (score: 0.7709)
  - docs/V1_2_0_PHASE_A2_FINAL_SUMMARY.md (score: 0.6483)
  - docs/V1_1_4_STATE_SNAPSHOT.md (score: 0.6431)

**[❌] Q009: Unity WebGL build verification 26 checks** (R@5=0.00, MRR=0.0000)
- Expected: scripts/check-unity-webgl-build.js, docs/STASH_VALIDATION_REPORT.md
- Violations: 0
- Top 5:
  - docs/V1_0_0_TAG_APPROVAL.md (score: 1.0000)
  - docs/V1_1_4_STATE_SNAPSHOT.md (score: 1.0000)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A1_EVAL_REPORT.md (score: 1.0000)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A2_KEYWORD_IMPROVEMENT_REPORT.md (score: 1.0000)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A_REPORT.md (score: 1.0000)

**[❌] Q010: Five Iron Laws PartyGameSDK** (R@5=0.00, MRR=0.0000)
- Expected: docs/V1_1_4_STATE_SNAPSHOT.md, docs/BASELINE.md
- Violations: 0
- Top 5:
  - docs/RAG_RETRIEVAL_POLICY.md (score: 1.0000)
  - docs/STASH_VALIDATION_REPORT.md (score: 1.0000)
  - docs/V1_2_0_PHASE_B2_CHUNK_RECONSTRUCTION_REPORT.md (score: 1.0000)
  - agents/model-router/SOUL.md (score: 1.0000)
  - agents/rag-memory/RAG_RETRIEVAL_POLICY.md (score: 1.0000)

**[✅] Q011: agent runtime architecture v1.1.2** (R@5=1.00, MRR=0.3333)
- Expected: docs/V1_1_4_STATE_SNAPSHOT.md
- Violations: 0
- Top 5:
  - docs/AGENT_DASHBOARD_PHASE_REPORT.md (score: 1.0000)
  - docs/AGENT_DASHBOARD_PLAN.md (score: 1.0000)
  - docs/V1_1_4_STATE_SNAPSHOT.md (score: 1.0000)
  - docs/V1_2_0_EMBEDDING_ARCHITECTURE_DECISION.md (score: 1.0000)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A1_EVAL_REPORT.md (score: 1.0000)

**[❌] Q012: Git workflow rebase force push SSH key** (R@5=0.00, MRR=0.0000)
- Expected: docs/STASH_VALIDATION_REPORT.md, memory/2026-05-25.md
- Violations: 0
- Top 5:
  - docs/V1_2_0_RAG_MEMORY_PHASE_A1_EVAL_REPORT.md (score: 0.9236)
  - docs/V1_1_4_STATE_SNAPSHOT.md (score: 0.9081)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A2_KEYWORD_IMPROVEMENT_REPORT.md (score: 0.8305)
  - docs/V1_2_0_PHASE_B0_ENV_PREP_REPORT.md (score: 0.7380)
  - docs/V1_2_0_PHASE_B_ENV_SETUP.md (score: 0.7314)

**[❌] Q013: Unity WebGL runtime pipeline WEBGL_RUNTIME_PIPELINE** (R@5=0.00, MRR=0.0000)
- Expected: UnityExamples/WEBGL_RUNTIME_PIPELINE.md
- Violations: 0
- Top 5:
  - docs/AGENT_INTELLIGENCE_LAYER_REPORT.md (score: 1.0000)
  - docs/AGENT_STUDIO_HIERARCHY.md (score: 1.0000)
  - docs/GOVERNANCE_LAYER_REPORT.md (score: 1.0000)
  - docs/RUNTIME_ARTIFACT_POLICY.md (score: 1.0000)
  - docs/RUNTIME_AUTOMATION_PHASE_REPORT.md (score: 1.0000)

**[✅] Q014: Material Policy URP Lit SimpleLit Unlit** (R@5=1.00, MRR=0.2500)
- Expected: UnityExamples/UNITY_WEBGL_MATERIAL_POLICY.md
- Violations: 0
- Top 5:
  - docs/V1_1_4_STATE_SNAPSHOT.md (score: 1.0000)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A1_EVAL_REPORT.md (score: 1.0000)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A_REPORT.md (score: 1.0000)
  - UnityExamples/UNITY_WEBGL_MATERIAL_POLICY.md (score: 1.0000)
  - agents/rag-memory/RAG_RETRIEVAL_POLICY.md (score: 0.8449)

**[✅] Q015: QClaw review prompt template** (R@5=1.00, MRR=0.5000)
- Expected: prompts/qclaw_review.prompt.md
- Violations: 0
- Top 5:
  - docs/V1_2_0_PHASE_B2_CHUNK_RECONSTRUCTION_REPORT.md (score: 1.0000)
  - prompts/qclaw_review.prompt.md (score: 1.0000)
  - agents/rag-memory/RAG_RETRIEVAL_POLICY.md (score: 0.9190)
  - prompts/rag_retrieval.prompt.md (score: 0.8940)
  - prompts/codex_task.prompt.md (score: 0.8340)

**[✅] Q016: Codex task decomposition prompt** (R@5=1.00, MRR=0.5000)
- Expected: prompts/codex_task.prompt.md
- Violations: 0
- Top 5:
  - docs/V1_2_0_PHASE_B2_CHUNK_RECONSTRUCTION_REPORT.md (score: 1.0000)
  - prompts/codex_task.prompt.md (score: 1.0000)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A2_KEYWORD_IMPROVEMENT_REPORT.md (score: 0.7723)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A1_EVAL_REPORT.md (score: 0.7709)
  - prompts/rag_retrieval.prompt.md (score: 0.7690)

**[❌] Q017: Prometheus metrics Grafana dashboard Agent Dashboard** (R@5=0.00, MRR=0.0000)
- Expected: docker/prometheus/prometheus.yml
- Violations: 0
- Top 5:
  - docs/AGENT_DASHBOARD_PHASE_REPORT.md (score: 1.0000)
  - docs/AGENT_DASHBOARD_PLAN.md (score: 1.0000)
  - docs/AGENT_INTELLIGENCE_LAYER_REPORT.md (score: 1.0000)
  - docs/AGENT_STUDIO_HIERARCHY.md (score: 1.0000)
  - docs/PHASE_3_GRAFANA_READINESS_REPORT.md (score: 1.0000)

**[❌] Q018: PostgreSQL pgvector RAG Memory v1.2.0 Phase B** (R@5=0.00, MRR=0.1000)
- Expected: docs/V1_2_0_RAG_MEMORY_PHASE_A_REPORT.md
- Violations: 0
- Top 5:
  - docs/AGENT_DASHBOARD_PLAN.md (score: 1.0000)
  - docs/V1_1_4_STATE_SNAPSHOT.md (score: 1.0000)
  - docs/V1_2_0_PHASE_A2_FINAL_SUMMARY.md (score: 1.0000)
  - docs/V1_2_0_PHASE_B0_ENV_PREP_REPORT.md (score: 1.0000)
  - docs/V1_2_0_PHASE_B2_CHUNK_RECONSTRUCTION_REPORT.md (score: 1.0000)

**[❌] Q019: Unity WebGL baseline v0.1.0 PartyGameSDK** (R@5=0.00, MRR=0.0000)
- Expected: docs/BASELINE.md, PartyGameSDK-MVP/BASELINE.md
- Violations: 0
- Top 5:
  - docs/STASH_VALIDATION_REPORT.md (score: 1.0000)
  - docs/V1_0_0_RELEASE_SUMMARY.md (score: 1.0000)
  - docs/V1_1_4_STATE_SNAPSHOT.md (score: 1.0000)
  - docs/V1_2_0_PHASE_A2_FINAL_SUMMARY.md (score: 1.0000)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A1_EVAL_REPORT.md (score: 1.0000)

**[✅] Q020: server.js injection playerIndex PartyGameSDK protocol** (R@5=0.50, MRR=1.0000)
- Expected: docs/V1_1_4_STATE_SNAPSHOT.md, docs/PROTOCOL_GENERALIZATION_REPORT.md
- Violations: modify server.js
- Top 5:
  - docs/V1_1_4_STATE_SNAPSHOT.md (score: 1.0000)
  - docs/V1_2_0_PHASE_A2_FINAL_SUMMARY.md (score: 1.0000)
  - docs/V1_2_0_PHASE_B0_ENV_PREP_REPORT.md (score: 1.0000)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A1_EVAL_REPORT.md (score: 1.0000)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A2_KEYWORD_IMPROVEMENT_REPORT.md (score: 1.0000)

### SEMANTIC

**[❌] Q001: hard constraints server.js** (R@5=0.00, MRR=0.0000)
- Expected: docs/V1_1_4_STATE_SNAPSHOT.md, agents/rag-memory/RAG_RETRIEVAL_POLICY.md
- Violations: 0
- Top 5:
  - agents/rag-memory/SOUL.md (score: 0.6171)
  - docs/STASH_VALIDATION_REPORT.md (score: 0.5923)
  - docs/V1_2_0_PHASE_B0_ENV_PREP_REPORT.md (score: 0.5762)
  - UnityExamples/_RuntimeVerifiedTemplate/WEBGL_SHADER_COMPATIBILITY_REPORT.md (score: 0.5759)
  - UnityExamples/AGENT_GAME_GENERATION_PROMPT.md (score: 0.5738)

**[❌] Q002: Unity WebGL material policy** (R@5=0.00, MRR=0.0000)
- Expected: UnityExamples/UNITY_WEBGL_MATERIAL_POLICY.md, docs/V1_1_4_STATE_SNAPSHOT.md
- Violations: 0
- Top 5:
  - agents/rag-memory/SOUL.md (score: 0.5782)
  - prompts/release_gate.prompt.md (score: 0.4949)
  - docs/MANUAL_DEVICE_QA_RESULT_TEMPLATE.md (score: 0.4427)
  - docs/AGENT_STUDIO_HIERARCHY.md (score: 0.4221)

**[✅] Q003: stash validation report** (R@5=1.00, MRR=1.0000)
- Expected: docs/STASH_VALIDATION_REPORT.md
- Violations: 0
- Top 5:
  - docs/STASH_VALIDATION_REPORT.md (score: 0.4157)

**[✅] Q004: release gate process** (R@5=0.50, MRR=1.0000)
- Expected: prompts/release_gate.prompt.md, docs/V1_1_4_STATE_SNAPSHOT.md
- Violations: 0
- Top 5:
  - docs/V1_1_4_STATE_SNAPSHOT.md (score: 0.5791)

**[❌] Q005: Agent Dashboard Next.js shadcn/ui** (R@5=0.00, MRR=0.0000)
- Expected: agent-dashboard/README.md, docs/V1_1_4_STATE_SNAPSHOT.md
- Violations: 0
- Top 5:
  - docs/STASH_VALIDATION_REPORT.md (score: 0.6240)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A_REPORT.md (score: 0.6224)
  - agents/model-router/SOUL.md (score: 0.6089)
  - scripts/ci-test.sh (score: 0.6087)
  - prompts/qclaw_review.prompt.md (score: 0.6086)

**[❌] Q006: RAG memory retrieval policy** (R@5=0.00, MRR=0.0000)
- Expected: agents/rag-memory/RAG_RETRIEVAL_POLICY.md
- Violations: 0
- Top 5:
  - docs/V1_2_0_RAG_MEMORY_PHASE_A1_EVAL_REPORT.md (score: 0.6553)
  - docs/V1_2_0_PHASE_A2_FINAL_SUMMARY.md (score: 0.6487)
  - agents/rag-memory/README.md (score: 0.6428)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A_REPORT.md (score: 0.6174)
  - agents/rag-memory/SOUL.md (score: 0.6098)

**[✅] Q007: token cost analysis Agent Intelligence** (R@5=1.00, MRR=0.2500)
- Expected: docs/V1_1_4_STATE_SNAPSHOT.md
- Violations: 0
- Top 5:
  - docs/EMBEDDING_COST_MODEL.md (score: 0.6588)
  - docs/AGENT_INTELLIGENCE_LAYER_REPORT.md (score: 0.6407)
  - agents/token-cost/README.md (score: 0.6129)
  - docs/V1_1_4_STATE_SNAPSHOT.md (score: 0.5794)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A1_EVAL_REPORT.md (score: 0.5690)

**[✅] Q008: canary deployment pipeline v0.4.0** (R@5=0.50, MRR=0.2000)
- Expected: docs/V1_1_4_STATE_SNAPSHOT.md, docs/V1_1_4_RUNTIME_SANITY_REPORT.md
- Violations: 0
- Top 5:
  - docs/WORKFLOW_COMMANDS.md (score: 0.6606)
  - docs/PRODUCTION_RELEASE_REPORT.md (score: 0.6456)
  - prompts/release_gate.prompt.md (score: 0.6404)
  - docs/GOVERNANCE_LAYER_REPORT.md (score: 0.6383)
  - docs/V1_1_4_STATE_SNAPSHOT.md (score: 0.5976)

**[❌] Q009: Unity WebGL build verification 26 checks** (R@5=0.00, MRR=0.1667)
- Expected: scripts/check-unity-webgl-build.js, docs/STASH_VALIDATION_REPORT.md
- Violations: 0
- Top 5:
  - UnityExamples/WEBGL_RUNTIME_PIPELINE.md (score: 0.6665)
  - UnityExamples/BreakoutTemplateDemo/WEBGL_BUILD_VALIDATION_REPORT.md (score: 0.6290)
  - docs/HTTPS_WSS_SUPPLEMENTAL_QA_PLAN.md (score: 0.6289)
  - docs/V1_0_1_GOVERNANCE_REPORT.md (score: 0.6253)
  - docs/WORKFLOW_COMMANDS.md (score: 0.6252)

**[❌] Q010: Five Iron Laws PartyGameSDK** (R@5=0.00, MRR=0.0000)
- Expected: docs/V1_1_4_STATE_SNAPSHOT.md, docs/BASELINE.md
- Violations: 0
- Top 5:
  - UnityExamples/SnakeTemplateDemo/GAME_SPEC.md (score: 0.6686)
  - UnityExamples/UNITY_WEBGL_REAL_BUILD_GATE.md (score: 0.6447)
  - docs/DEPLOYMENT_CHECKLIST.md (score: 0.6431)
  - README.md (score: 0.6394)
  - UnityExamples/_GameTemplateSkeleton/TEST_CHECKLIST.md (score: 0.6308)

**[❌] Q011: agent runtime architecture v1.1.2** (R@5=0.00, MRR=0.0000)
- Expected: docs/V1_1_4_STATE_SNAPSHOT.md
- Violations: 0
- Top 5:
  - docs/AGENT_STUDIO_HIERARCHY.md (score: 0.7051)
  - agents/token-cost/README.md (score: 0.6457)
  - docs/V1_0_1_GOVERNANCE_REPORT.md (score: 0.6420)
  - docs/WORKFLOW_COMMANDS.md (score: 0.6396)
  - docs/GOVERNANCE_LAYER_REPORT.md (score: 0.6064)

**[❌] Q012: Git workflow rebase force push SSH key** (R@5=0.00, MRR=0.0000)
- Expected: docs/STASH_VALIDATION_REPORT.md, memory/2026-05-25.md
- Violations: 0
- Top 5:
  - docs/templates/GAME_SPEC_TEMPLATE.md (score: 0.5654)
  - docs/V1_0_1_GOVERNANCE_REPORT.md (score: 0.5596)
  - UnityExamples/GAME_TEMPLATE_FACTORY.md (score: 0.5521)
  - docs/templates/CONTROLLER_SPEC_TEMPLATE.md (score: 0.5519)
  - docs/V1_1_4_STATE_SNAPSHOT.md (score: 0.5483)

**[❌] Q013: Unity WebGL runtime pipeline WEBGL_RUNTIME_PIPELINE** (R@5=0.00, MRR=0.1667)
- Expected: UnityExamples/WEBGL_RUNTIME_PIPELINE.md
- Violations: 0
- Top 5:
  - docs/WORKFLOW_COMMANDS.md (score: 0.6586)
  - UnityExamples/JumpJumpTemplateDemo/WEBGL_BUILD_VALIDATION_REPORT.md (score: 0.6033)
  - UnityExamples/_RuntimeVerifiedTemplate/WEBGL_BUILD_VALIDATION_REPORT.md (score: 0.6033)
  - UnityExamples/RUNTIME_VERIFIED_TEMPLATE_REPORT.md (score: 0.5934)
  - docs/templates/RELEASE_GATE_REPORT_TEMPLATE.md (score: 0.5895)

**[❌] Q014: Material Policy URP Lit SimpleLit Unlit** (R@5=0.00, MRR=0.0000)
- Expected: UnityExamples/UNITY_WEBGL_MATERIAL_POLICY.md
- Violations: 0
- Top 5:
  - UnityExamples/SnakeTemplateDemo/GAME_SPEC.md (score: 0.6828)
  - UnityExamples/UNITY_WEBGL_REAL_BUILD_GATE.md (score: 0.6589)
  - README.md (score: 0.6579)
  - docs/DEPLOYMENT_CHECKLIST.md (score: 0.6548)
  - UnityExamples/_GameTemplateSkeleton/TEST_CHECKLIST.md (score: 0.6462)

**[✅] Q015: QClaw review prompt template** (R@5=1.00, MRR=0.2000)
- Expected: prompts/qclaw_review.prompt.md
- Violations: 0
- Top 5:
  - UnityExamples/_RuntimeVerifiedTemplate/WEBGL_BUILD_FIX_REPORT.md (score: 0.5955)
  - UnityExamples/JumpJumpTemplateDemo/WEBGL_BUILD_FIX_REPORT.md (score: 0.5955)
  - agents/runtime-triage/SOUL.md (score: 0.5874)
  - docs/V1_0_1_GOVERNANCE_REPORT.md (score: 0.5856)
  - prompts/qclaw_review.prompt.md (score: 0.5827)

**[❌] Q016: Codex task decomposition prompt** (R@5=0.00, MRR=0.0000)
- Expected: prompts/codex_task.prompt.md
- Violations: 0
- Top 5:
  - scripts/ci-test.sh (score: 0.5021)
  - UnityExamples/_RuntimeVerifiedTemplate/WEBGL_BUILD_VALIDATION_REPORT.md (score: 0.4723)
  - UnityExamples/JumpJumpTemplateDemo/WEBGL_BUILD_VALIDATION_REPORT.md (score: 0.4723)
  - UnityExamples/GAME_TEMPLATE_FACTORY.md (score: 0.4635)
  - docs/DEPLOYMENT_CHECKLIST.md (score: 0.4565)

**[❌] Q017: Prometheus metrics Grafana dashboard Agent Dashboard** (R@5=0.00, MRR=0.0000)
- Expected: docker/prometheus/prometheus.yml
- Violations: 0
- Top 5:
  - docs/V1_0_0_RELEASE_SUMMARY.md (score: 0.6926)
  - docs/templates/RELEASE_GATE_REPORT_TEMPLATE.md (score: 0.6802)
  - agents/token-cost/README.md (score: 0.6802)
  - docs/QA_BUGFIX_LOG.md (score: 0.6728)
  - docs/PHASE_3_GRAFANA_READINESS_REPORT.md (score: 0.6488)

**[❌] Q018: PostgreSQL pgvector RAG Memory v1.2.0 Phase B** (R@5=0.00, MRR=0.0000)
- Expected: docs/V1_2_0_RAG_MEMORY_PHASE_A_REPORT.md
- Violations: 0
- Top 5:
  - docs/V1_2_0_PHASE_B_ENV_SETUP.md (score: 0.6828)
  - docs/V1_2_0_PHASE_B_DEPENDENCY_PLAN.md (score: 0.5180)

**[❌] Q019: Unity WebGL baseline v0.1.0 PartyGameSDK** (R@5=0.00, MRR=0.0000)
- Expected: docs/BASELINE.md, PartyGameSDK-MVP/BASELINE.md
- Violations: 0
- Top 5:
  - docs/GOVERNANCE_LAYER_REPORT.md (score: 0.6510)
  - docs/V1_1_4_STATE_SNAPSHOT.md (score: 0.6426)
  - docs/AGENT_STUDIO_HIERARCHY.md (score: 0.6325)
  - docs/PRODUCTION_RELEASE_REPORT.md (score: 0.6301)
  - docs/V1_0_0_RELEASE_SUMMARY.md (score: 0.6248)

**[✅] Q020: server.js injection playerIndex PartyGameSDK protocol** (R@5=0.50, MRR=1.0000)
- Expected: docs/V1_1_4_STATE_SNAPSHOT.md, docs/PROTOCOL_GENERALIZATION_REPORT.md
- Violations: 0
- Top 5:
  - docs/V1_1_4_STATE_SNAPSHOT.md (score: 0.7345)
  - UnityExamples/SnakeTemplateDemo/BUILD_GUIDE.md (score: 0.6467)
  - UnityExamples/UNITY_WEBGL_REAL_BUILD_GATE.md (score: 0.6445)
  - UnityExamples/_GameTemplateSkeleton/BUILD_GUIDE.md (score: 0.6444)
  - docs/V1_2_0_PHASE_B2_CHUNK_RECONSTRUCTION_REPORT.md (score: 0.6239)

### HYBRID

**[✅] Q001: hard constraints server.js** (R@5=1.00, MRR=0.5000)
- Expected: docs/V1_1_4_STATE_SNAPSHOT.md, agents/rag-memory/RAG_RETRIEVAL_POLICY.md
- Violations: 0
- Top 5:
  - docs/V1_2_0_PHASE_A2_FINAL_SUMMARY.md (score: 0.8232)
  - agents/rag-memory/RAG_RETRIEVAL_POLICY.md (score: 0.8129)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A_REPORT.md (score: 0.8029)
  - docs/V1_1_4_STATE_SNAPSHOT.md (score: 0.7138)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A1_EVAL_REPORT.md (score: 0.6800)

**[✅] Q002: Unity WebGL material policy** (R@5=0.50, MRR=1.0000)
- Expected: UnityExamples/UNITY_WEBGL_MATERIAL_POLICY.md, docs/V1_1_4_STATE_SNAPSHOT.md
- Violations: 0
- Top 5:
  - UnityExamples/UNITY_WEBGL_MATERIAL_POLICY.md (score: 0.8750)
  - agents/rag-memory/RAG_RETRIEVAL_POLICY.md (score: 0.8201)
  - UnityExamples/RUNTIME_VERIFIED_TEMPLATE_REPORT.md (score: 0.8090)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A1_EVAL_REPORT.md (score: 0.8057)
  - UnityExamples/JumpJumpTemplateDemo/WEBGL_CURRENT_SCENE_VALIDATION_REPORT.md (score: 0.6250)

**[✅] Q003: stash validation report** (R@5=1.00, MRR=1.0000)
- Expected: docs/STASH_VALIDATION_REPORT.md
- Violations: 0
- Top 5:
  - docs/STASH_VALIDATION_REPORT.md (score: 0.8750)
  - docs/V1_0_1_GOVERNANCE_REPORT.md (score: 0.7742)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A_REPORT.md (score: 0.7724)
  - UnityExamples/_RuntimeVerifiedTemplate/WEBGL_BUILD_FIX_REPORT.md (score: 0.7696)
  - UnityExamples/JumpJumpTemplateDemo/WEBGL_BUILD_FIX_REPORT.md (score: 0.7696)

**[✅] Q004: release gate process** (R@5=0.50, MRR=0.3333)
- Expected: prompts/release_gate.prompt.md, docs/V1_1_4_STATE_SNAPSHOT.md
- Violations: 0
- Top 5:
  - docs/templates/RELEASE_GATE_REPORT_TEMPLATE.md (score: 0.8333)
  - docs/AGENT_DASHBOARD_PHASE_REPORT.md (score: 0.7710)
  - prompts/release_gate.prompt.md (score: 0.7687)
  - docs/WORKFLOW_COMMANDS.md (score: 0.7168)
  - docs/V1_0_1_GOVERNANCE_REPORT.md (score: 0.6500)

**[✅] Q005: Agent Dashboard Next.js shadcn/ui** (R@5=0.50, MRR=0.3333)
- Expected: agent-dashboard/README.md, docs/V1_1_4_STATE_SNAPSHOT.md
- Violations: 0
- Top 5:
  - docs/AGENT_DASHBOARD_PHASE_REPORT.md (score: 0.8318)
  - docs/AGENT_DASHBOARD_PLAN.md (score: 0.8126)
  - docs/V1_1_4_STATE_SNAPSHOT.md (score: 0.7669)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A2_KEYWORD_IMPROVEMENT_REPORT.md (score: 0.6629)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A_REPORT.md (score: 0.6508)

**[✅] Q006: RAG memory retrieval policy** (R@5=1.00, MRR=1.0000)
- Expected: agents/rag-memory/RAG_RETRIEVAL_POLICY.md
- Violations: 0
- Top 5:
  - agents/rag-memory/RAG_RETRIEVAL_POLICY.md (score: 0.9750)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A1_EVAL_REPORT.md (score: 0.9248)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A_REPORT.md (score: 0.9045)
  - docs/RAG_RETRIEVAL_POLICY.md (score: 0.8568)
  - agents/rag-memory/README.md (score: 0.8359)

**[❌] Q007: token cost analysis Agent Intelligence** (R@5=0.00, MRR=0.1667)
- Expected: docs/V1_1_4_STATE_SNAPSHOT.md
- Violations: 0
- Top 5:
  - docs/AGENT_INTELLIGENCE_LAYER_REPORT.md (score: 0.8865)
  - docs/AGENT_DASHBOARD_PHASE_REPORT.md (score: 0.8489)
  - agents/token-cost/README.md (score: 0.7626)
  - agents/token-cost/SOUL.md (score: 0.7567)
  - docs/AGENT_DASHBOARD_PLAN.md (score: 0.7325)

**[❌] Q008: canary deployment pipeline v0.4.0** (R@5=0.00, MRR=0.1250)
- Expected: docs/V1_1_4_STATE_SNAPSHOT.md, docs/V1_1_4_RUNTIME_SANITY_REPORT.md
- Violations: 0
- Top 5:
  - docs/V1_0_0_RELEASE_SUMMARY.md (score: 0.7359)
  - docs/templates/RELEASE_GATE_REPORT_TEMPLATE.md (score: 0.5552)
  - docs/GOVERNANCE_LAYER_REPORT.md (score: 0.5181)
  - docs/PRODUCTION_RELEASE_REPORT.md (score: 0.5137)
  - docs/WORKFLOW_COMMANDS.md (score: 0.4681)

**[❌] Q009: Unity WebGL build verification 26 checks** (R@5=0.00, MRR=0.1000)
- Expected: scripts/check-unity-webgl-build.js, docs/STASH_VALIDATION_REPORT.md
- Violations: 0
- Top 5:
  - UnityExamples/WEBGL_RUNTIME_PIPELINE.md (score: 0.7944)
  - UnityExamples/JumpJumpTemplateDemo/WEBGL_BUILD_FIX_REPORT.md (score: 0.7750)
  - UnityExamples/_RuntimeVerifiedTemplate/WEBGL_BUILD_FIX_REPORT.md (score: 0.7750)
  - UnityExamples/JumpJumpTemplateDemo/WEBGL_BUILD_VALIDATION_REPORT.md (score: 0.7575)
  - UnityExamples/_RuntimeVerifiedTemplate/WEBGL_BUILD_VALIDATION_REPORT.md (score: 0.7575)

**[❌] Q010: Five Iron Laws PartyGameSDK** (R@5=0.00, MRR=0.1000)
- Expected: docs/V1_1_4_STATE_SNAPSHOT.md, docs/BASELINE.md
- Violations: 0
- Top 5:
  - agents/model-router/SOUL.md (score: 1.0000)
  - agents/rag-memory/SOUL.md (score: 1.0000)
  - agents/rag-memory/RAG_RETRIEVAL_POLICY.md (score: 0.8300)
  - docs/STASH_VALIDATION_REPORT.md (score: 0.8264)
  - docs/RAG_RETRIEVAL_POLICY.md (score: 0.6800)

**[✅] Q011: agent runtime architecture v1.1.2** (R@5=1.00, MRR=0.2500)
- Expected: docs/V1_1_4_STATE_SNAPSHOT.md
- Violations: 0
- Top 5:
  - docs/AGENT_DASHBOARD_PHASE_REPORT.md (score: 0.8868)
  - agents/runtime-triage/README.md (score: 0.8546)
  - docs/AGENT_DASHBOARD_PLAN.md (score: 0.8211)
  - docs/V1_1_4_STATE_SNAPSHOT.md (score: 0.7875)
  - docs/AGENT_INTELLIGENCE_LAYER_REPORT.md (score: 0.7866)

**[✅] Q012: Git workflow rebase force push SSH key** (R@5=0.50, MRR=0.2000)
- Expected: docs/STASH_VALIDATION_REPORT.md, memory/2026-05-25.md
- Violations: 0
- Top 5:
  - docs/V1_2_0_PHASE_B0_ENV_PREP_REPORT.md (score: 0.7480)
  - prompts/codex_task.prompt.md (score: 0.6892)
  - docs/V1_2_0_PHASE_B_ENV_SETUP.md (score: 0.6250)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A1_EVAL_REPORT.md (score: 0.5500)
  - docs/STASH_VALIDATION_REPORT.md (score: 0.4677)

**[❌] Q013: Unity WebGL runtime pipeline WEBGL_RUNTIME_PIPELINE** (R@5=0.00, MRR=0.0000)
- Expected: UnityExamples/WEBGL_RUNTIME_PIPELINE.md
- Violations: 0
- Top 5:
  - docs/STASH_VALIDATION_REPORT.md (score: 0.8203)
  - docs/WEBGL_RUNTIME_AUTOMATION_PLAN.md (score: 0.8079)
  - docs/GOVERNANCE_LAYER_REPORT.md (score: 0.7889)
  - docs/WORKFLOW_COMMANDS.md (score: 0.7750)
  - docs/templates/UNITY_BUILD_REPORT_TEMPLATE.md (score: 0.6666)

**[✅] Q014: Material Policy URP Lit SimpleLit Unlit** (R@5=1.00, MRR=1.0000)
- Expected: UnityExamples/UNITY_WEBGL_MATERIAL_POLICY.md
- Violations: 0
- Top 5:
  - UnityExamples/UNITY_WEBGL_MATERIAL_POLICY.md (score: 0.5583)
  - agents/rag-memory/RAG_RETRIEVAL_POLICY.md (score: 0.5095)
  - UnityExamples/GAME_TEMPLATE_FACTORY.md (score: 0.4352)
  - docs/V1_1_4_STATE_SNAPSHOT.md (score: 0.3250)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A1_EVAL_REPORT.md (score: 0.3250)

**[✅] Q015: QClaw review prompt template** (R@5=1.00, MRR=1.0000)
- Expected: prompts/qclaw_review.prompt.md
- Violations: 0
- Top 5:
  - prompts/qclaw_review.prompt.md (score: 0.8984)
  - agents/rag-memory/RAG_RETRIEVAL_POLICY.md (score: 0.7012)
  - UnityExamples/UNITY_WEBGL_MATERIAL_POLICY.md (score: 0.6363)
  - agents/rag-memory/README.md (score: 0.6063)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A_REPORT.md (score: 0.5287)

**[✅] Q016: Codex task decomposition prompt** (R@5=1.00, MRR=1.0000)
- Expected: prompts/codex_task.prompt.md
- Violations: 0
- Top 5:
  - prompts/codex_task.prompt.md (score: 0.9000)
  - prompts/rag_retrieval.prompt.md (score: 0.6597)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A_REPORT.md (score: 0.5191)
  - prompts/release_gate.prompt.md (score: 0.4771)
  - prompts/qclaw_review.prompt.md (score: 0.4701)

**[❌] Q017: Prometheus metrics Grafana dashboard Agent Dashboard** (R@5=0.00, MRR=0.0000)
- Expected: docker/prometheus/prometheus.yml
- Violations: 0
- Top 5:
  - docs/AGENT_DASHBOARD_PLAN.md (score: 0.8626)
  - docs/V1_1_4_STATE_SNAPSHOT.md (score: 0.7971)
  - docs/V1_0_0_RELEASE_SUMMARY.md (score: 0.7439)
  - docker/monitoring/README.md (score: 0.7269)
  - docs/PHASE_3_GRAFANA_READINESS_REPORT.md (score: 0.6949)

**[✅] Q018: PostgreSQL pgvector RAG Memory v1.2.0 Phase B** (R@5=1.00, MRR=1.0000)
- Expected: docs/V1_2_0_RAG_MEMORY_PHASE_A_REPORT.md
- Violations: 0
- Top 5:
  - docs/V1_2_0_RAG_MEMORY_PHASE_A_REPORT.md (score: 0.9417)
  - docs/V1_1_4_STATE_SNAPSHOT.md (score: 0.8728)
  - docs/V1_2_0_PHASE_B_ENV_SETUP.md (score: 0.8297)
  - docs/V1_2_0_PHASE_B0_ENV_PREP_REPORT.md (score: 0.7670)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A1_EVAL_REPORT.md (score: 0.7626)

**[❌] Q019: Unity WebGL baseline v0.1.0 PartyGameSDK** (R@5=0.00, MRR=0.0000)
- Expected: docs/BASELINE.md, PartyGameSDK-MVP/BASELINE.md
- Violations: 0
- Top 5:
  - docs/V1_0_0_RELEASE_SUMMARY.md (score: 0.7750)
  - agents/rag-memory/RAG_RETRIEVAL_POLICY.md (score: 0.7176)
  - PARTY_GAME_SDK_FINAL_HANDOFF.md (score: 0.7000)
  - agents/release-manager/SOUL.md (score: 0.7000)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A_REPORT.md (score: 0.6955)

**[✅] Q020: server.js injection playerIndex PartyGameSDK protocol** (R@5=0.50, MRR=0.5000)
- Expected: docs/V1_1_4_STATE_SNAPSHOT.md, docs/PROTOCOL_GENERALIZATION_REPORT.md
- Violations: 0
- Top 5:
  - agents/rag-memory/SOUL.md (score: 1.0000)
  - docs/V1_1_4_STATE_SNAPSHOT.md (score: 0.8368)
  - docs/V1_2_0_PHASE_B2_CHUNK_RECONSTRUCTION_REPORT.md (score: 0.7932)
  - prompts/codex_task.prompt.md (score: 0.7490)
  - docs/QA_PHASE1_LOG.md (score: 0.7166)

