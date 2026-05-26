# RAG Retrieval Evaluation Report

Generated: 2026-05-26T06:37:54.665Z

## Summary

| Mode | Recall@5 | Precision@5 | MRR | NDCG@5 | Violations |
|------|----------|-------------|-----|--------|------------|
| keyword | 0.4500 | 0.1300 | 0.2971 | 0.2835 | 0 |
| semantic | 0.2500 | 0.0800 | 0.2438 | 0.1876 | 0 |
| hybrid | 0.4000 | 0.1100 | 0.2910 | 0.2794 | 0 |

## Detailed Results

### KEYWORD

**QQ001: hard constraints server.js**
- Category: hard_constraints
- Expected: docs/V1_1_4_STATE_SNAPSHOT.md, agents/rag-memory/RAG_RETRIEVAL_POLICY.md
- Recall@5: 0.5000
- Violations: 0
- Top 5:
  - docs/V1_1_4_STATE_SNAPSHOT.md (score: 1.0000)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A1_EVAL_REPORT.md (score: 1.0000)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A_REPORT.md (score: 1.0000)
  - docs/STASH_VALIDATION_REPORT.md (score: 0.7576)
  - UnityExamples/_RuntimeVerifiedTemplate/BUILD_GUIDE.md (score: 0.6584)

**QQ002: Unity WebGL material policy**
- Category: material_policy
- Expected: UnityExamples/UNITY_WEBGL_MATERIAL_POLICY.md, docs/V1_1_4_STATE_SNAPSHOT.md
- Recall@5: 0.5000
- Violations: 0
- Top 5:
  - docs/AGENT_INTELLIGENCE_LAYER_REPORT.md (score: 1.0000)
  - docs/RUNTIME_AUTOMATION_PHASE_REPORT.md (score: 1.0000)
  - docs/STASH_VALIDATION_REPORT.md (score: 1.0000)
  - docs/V1_1_4_STATE_SNAPSHOT.md (score: 1.0000)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A1_EVAL_REPORT.md (score: 1.0000)

**QQ003: stash validation report**
- Category: git_governance
- Expected: docs/STASH_VALIDATION_REPORT.md
- Recall@5: 1.0000
- Violations: 0
- Top 5:
  - docs/STASH_VALIDATION_REPORT.md (score: 1.0000)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A1_EVAL_REPORT.md (score: 1.0000)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A_REPORT.md (score: 1.0000)
  - UnityExamples/BreakoutTemplateDemo/WEBGL_BUILD_VALIDATION_REPORT.md (score: 1.0000)
  - UnityExamples/SnakeTemplateDemo/WEBGL_BUILD_VALIDATION_REPORT.md (score: 1.0000)

**QQ004: release gate process**
- Category: release_gate
- Expected: prompts/release_gate.prompt.md, docs/V1_1_4_STATE_SNAPSHOT.md
- Recall@5: 0.0000
- Violations: 0
- Top 5:
  - docs/AGENT_DASHBOARD_PHASE_REPORT.md (score: 1.0000)
  - docs/AGENT_DASHBOARD_PLAN.md (score: 1.0000)
  - docs/V1_0_1_GOVERNANCE_REPORT.md (score: 1.0000)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A1_EVAL_REPORT.md (score: 1.0000)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A_REPORT.md (score: 1.0000)

**QQ005: Agent Dashboard Next.js shadcn/ui**
- Category: dashboard
- Expected: agent-dashboard/README.md, docs/V1_1_4_STATE_SNAPSHOT.md
- Recall@5: 0.5000
- Violations: 0
- Top 5:
  - docs/AGENT_DASHBOARD_PHASE_REPORT.md (score: 1.0000)
  - docs/AGENT_DASHBOARD_PLAN.md (score: 1.0000)
  - docs/AGENT_INTELLIGENCE_LAYER_REPORT.md (score: 1.0000)
  - docs/AGENT_STUDIO_HIERARCHY.md (score: 1.0000)
  - docs/V1_1_4_STATE_SNAPSHOT.md (score: 1.0000)

**QQ006: RAG memory retrieval policy**
- Category: rag_memory
- Expected: agents/rag-memory/RAG_RETRIEVAL_POLICY.md
- Recall@5: 0.0000
- Violations: 0
- Top 5:
  - docs/AGENT_INTELLIGENCE_LAYER_REPORT.md (score: 1.0000)
  - docs/RAG_RETRIEVAL_POLICY.md (score: 1.0000)
  - docs/V1_1_4_STATE_SNAPSHOT.md (score: 1.0000)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A1_EVAL_REPORT.md (score: 1.0000)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A_REPORT.md (score: 1.0000)

**QQ007: token cost analysis Agent Intelligence**
- Category: token_cost
- Expected: docs/V1_1_4_STATE_SNAPSHOT.md
- Recall@5: 1.0000
- Violations: 0
- Top 5:
  - docs/AGENT_DASHBOARD_PHASE_REPORT.md (score: 1.0000)
  - docs/AGENT_DASHBOARD_PLAN.md (score: 1.0000)
  - docs/AGENT_INTELLIGENCE_LAYER_REPORT.md (score: 1.0000)
  - docs/AGENT_STUDIO_HIERARCHY.md (score: 1.0000)
  - docs/V1_1_4_STATE_SNAPSHOT.md (score: 1.0000)

**QQ008: canary deployment pipeline v0.4.0**
- Category: canary_pipeline
- Expected: docs/V1_1_4_STATE_SNAPSHOT.md, docs/V1_1_4_RUNTIME_SANITY_REPORT.md
- Recall@5: 0.5000
- Violations: 0
- Top 5:
  - docs/V1_0_0_RELEASE_SUMMARY.md (score: 0.9323)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A1_EVAL_REPORT.md (score: 0.8333)
  - docs/V1_1_4_STATE_SNAPSHOT.md (score: 0.7048)
  - docs/STASH_VALIDATION_REPORT.md (score: 0.6448)
  - PARTY_GAME_SDK_FINAL_HANDOFF.md (score: 0.5964)

**QQ009: Unity WebGL build verification 26 checks**
- Category: unity_webgl
- Expected: scripts/check-unity-webgl-build.js, docs/STASH_VALIDATION_REPORT.md
- Recall@5: 0.5000
- Violations: 0
- Top 5:
  - docs/GOVERNANCE_LAYER_REPORT.md (score: 1.0000)
  - docs/STASH_VALIDATION_REPORT.md (score: 1.0000)
  - docs/V1_0_0_TAG_APPROVAL.md (score: 1.0000)
  - docs/V1_1_4_STATE_SNAPSHOT.md (score: 1.0000)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A1_EVAL_REPORT.md (score: 1.0000)

**QQ010: Five Iron Laws PartyGameSDK**
- Category: hard_constraints
- Expected: docs/V1_1_4_STATE_SNAPSHOT.md, docs/BASELINE.md
- Recall@5: 0.5000
- Violations: 0
- Top 5:
  - docs/RAG_RETRIEVAL_POLICY.md (score: 1.0000)
  - docs/STASH_VALIDATION_REPORT.md (score: 1.0000)
  - docs/V1_1_4_STATE_SNAPSHOT.md (score: 1.0000)
  - agents/model-router/SOUL.md (score: 1.0000)
  - agents/rag-memory/SOUL.md (score: 1.0000)

**QQ011: agent runtime architecture v1.1.2**
- Category: agent_runtime
- Expected: docs/V1_1_4_STATE_SNAPSHOT.md
- Recall@5: 1.0000
- Violations: 0
- Top 5:
  - docs/AGENT_DASHBOARD_PHASE_REPORT.md (score: 1.0000)
  - docs/AGENT_DASHBOARD_PLAN.md (score: 1.0000)
  - docs/AGENT_STUDIO_HIERARCHY.md (score: 1.0000)
  - docs/V1_1_4_STATE_SNAPSHOT.md (score: 1.0000)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A1_EVAL_REPORT.md (score: 1.0000)

**QQ012: Git workflow rebase force push SSH key**
- Category: git_governance
- Expected: docs/STASH_VALIDATION_REPORT.md, memory/2026-05-25.md
- Recall@5: 0.5000
- Violations: 0
- Top 5:
  - docs/V1_2_0_RAG_MEMORY_PHASE_A1_EVAL_REPORT.md (score: 0.9860)
  - docs/V1_1_4_STATE_SNAPSHOT.md (score: 0.9698)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A_REPORT.md (score: 0.6378)
  - docs/STASH_VALIDATION_REPORT.md (score: 0.4615)
  - docs/RUNTIME_ARTIFACT_POLICY.md (score: 0.3869)

**QQ013: Unity WebGL runtime pipeline WEBGL_RUNTIME_PIPELINE**
- Category: unity_webgl
- Expected: UnityExamples/WEBGL_RUNTIME_PIPELINE.md
- Recall@5: 0.0000
- Violations: 0
- Top 5:
  - docs/AGENT_INTELLIGENCE_LAYER_REPORT.md (score: 1.0000)
  - docs/AGENT_STUDIO_HIERARCHY.md (score: 1.0000)
  - docs/GOVERNANCE_LAYER_REPORT.md (score: 1.0000)
  - docs/RUNTIME_ARTIFACT_POLICY.md (score: 1.0000)
  - docs/RUNTIME_AUTOMATION_PHASE_REPORT.md (score: 1.0000)

**QQ014: Material Policy URP Lit SimpleLit Unlit**
- Category: material_policy
- Expected: UnityExamples/UNITY_WEBGL_MATERIAL_POLICY.md
- Recall@5: 1.0000
- Violations: 0
- Top 5:
  - docs/V1_1_4_STATE_SNAPSHOT.md (score: 1.0000)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A1_EVAL_REPORT.md (score: 1.0000)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A_REPORT.md (score: 1.0000)
  - UnityExamples/UNITY_WEBGL_MATERIAL_POLICY.md (score: 1.0000)
  - UnityExamples/RUNTIME_VERIFIED_TEMPLATE_REPORT.md (score: 0.7691)

**QQ015: QClaw review prompt template**
- Category: rag_memory
- Expected: prompts/qclaw_review.prompt.md
- Recall@5: 0.0000
- Violations: 0
- Top 5:
  - docs/V1_2_0_RAG_MEMORY_PHASE_A1_EVAL_REPORT.md (score: 0.8333)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A_REPORT.md (score: 0.7064)
  - docs/V1_1_4_STATE_SNAPSHOT.md (score: 0.7048)
  - UnityExamples/_RuntimeVerifiedTemplate/WEBGL_BUILD_VALIDATION_REPORT.md (score: 0.6363)
  - UnityExamples/AGENT_GAME_GENERATION_PROMPT.md (score: 0.6016)

**QQ016: Codex task decomposition prompt**
- Category: rag_memory
- Expected: prompts/codex_task.prompt.md
- Recall@5: 0.0000
- Violations: 0
- Top 5:
  - docs/V1_2_0_RAG_MEMORY_PHASE_A1_EVAL_REPORT.md (score: 0.8333)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A_REPORT.md (score: 0.7064)
  - docs/V1_1_4_STATE_SNAPSHOT.md (score: 0.5298)
  - UnityExamples/AGENT_GAME_GENERATION_PROMPT.md (score: 0.4266)
  - docs/CODEX_QCLAW_HANDOFF.md (score: 0.4200)

**QQ017: Prometheus metrics Grafana dashboard Agent Dashboard**
- Category: dashboard
- Expected: docker/prometheus/prometheus.yml
- Recall@5: 0.0000
- Violations: 0
- Top 5:
  - docs/AGENT_DASHBOARD_PHASE_REPORT.md (score: 1.0000)
  - docs/AGENT_DASHBOARD_PLAN.md (score: 1.0000)
  - docs/AGENT_INTELLIGENCE_LAYER_REPORT.md (score: 1.0000)
  - docs/AGENT_STUDIO_HIERARCHY.md (score: 1.0000)
  - docs/DEPLOYMENT_CHECKLIST.md (score: 1.0000)

**QQ018: PostgreSQL pgvector RAG Memory v1.2.0 Phase B**
- Category: rag_memory
- Expected: docs/V1_2_0_RAG_MEMORY_PHASE_A_REPORT.md
- Recall@5: 1.0000
- Violations: 0
- Top 5:
  - docs/AGENT_DASHBOARD_PLAN.md (score: 1.0000)
  - docs/V1_1_4_STATE_SNAPSHOT.md (score: 1.0000)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A1_EVAL_REPORT.md (score: 1.0000)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A_REPORT.md (score: 1.0000)
  - docs/GOVERNANCE_LAYER_REPORT.md (score: 0.9591)

**QQ019: Unity WebGL baseline v0.1.0 PartyGameSDK**
- Category: unity_webgl
- Expected: docs/BASELINE.md, PartyGameSDK-MVP/BASELINE.md
- Recall@5: 0.0000
- Violations: 0
- Top 5:
  - docs/STASH_VALIDATION_REPORT.md (score: 1.0000)
  - docs/V1_0_0_RELEASE_SUMMARY.md (score: 1.0000)
  - docs/V1_1_4_STATE_SNAPSHOT.md (score: 1.0000)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A1_EVAL_REPORT.md (score: 1.0000)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A_REPORT.md (score: 1.0000)

**QQ020: server.js injection playerIndex PartyGameSDK protocol**
- Category: hard_constraints
- Expected: docs/V1_1_4_STATE_SNAPSHOT.md, docs/PROTOCOL_GENERALIZATION_REPORT.md
- Recall@5: 0.5000
- Violations: 0
- Top 5:
  - docs/V1_1_4_STATE_SNAPSHOT.md (score: 1.0000)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A1_EVAL_REPORT.md (score: 1.0000)
  - docs/STASH_VALIDATION_REPORT.md (score: 0.9409)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A_REPORT.md (score: 0.8536)
  - UnityExamples/WEBGL_RUNTIME_PIPELINE.md (score: 0.8403)

### SEMANTIC

**QQ001: hard constraints server.js**
- Category: hard_constraints
- Expected: docs/V1_1_4_STATE_SNAPSHOT.md, agents/rag-memory/RAG_RETRIEVAL_POLICY.md
- Recall@5: 0.5000
- Violations: 0
- Top 5:
  - agents/model-router/SOUL.md (score: 0.5311)
  - docs/PRODUCTION_RELEASE_REPORT.md (score: 0.4688)
  - UnityExamples/UNITY_WEBGL_MATERIAL_POLICY.md (score: 0.4116)
  - docs/V1_0_0_RELEASE_SUMMARY.md (score: 0.4083)
  - docs/V1_1_4_STATE_SNAPSHOT.md (score: 0.4023)

**QQ002: Unity WebGL material policy**
- Category: material_policy
- Expected: UnityExamples/UNITY_WEBGL_MATERIAL_POLICY.md, docs/V1_1_4_STATE_SNAPSHOT.md
- Recall@5: 0.5000
- Violations: 0
- Top 5:
  - docs/EMBEDDING_SECURITY_CONSTRAINTS.md (score: 0.5445)
  - docs/AGENT_INTELLIGENCE_LAYER_REPORT.md (score: 0.4624)
  - UnityExamples/AGENT_GAME_GENERATION_PROMPT.md (score: 0.4614)
  - docs/V1_2_0_PHASE_B0_ENV_PREP_REPORT.md (score: 0.4407)
  - docs/V1_1_4_STATE_SNAPSHOT.md (score: 0.4407)

**QQ003: stash validation report**
- Category: git_governance
- Expected: docs/STASH_VALIDATION_REPORT.md
- Recall@5: 0.0000
- Violations: 0
- Top 5:
  - docs/V1_0_1_GOVERNANCE_REPORT.md (score: 0.5098)
  - docs/PATH_SCOPED_RULES.md (score: 0.5017)
  - UnityExamples/MULTI_GAME_WEBGL_BUILD_REPORT.md (score: 0.4833)
  - docs/templates/HOTFIX_REPORT_TEMPLATE.md (score: 0.4736)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A_REPORT.md (score: 0.4689)

**QQ004: release gate process**
- Category: release_gate
- Expected: prompts/release_gate.prompt.md, docs/V1_1_4_STATE_SNAPSHOT.md
- Recall@5: 0.5000
- Violations: 0
- Top 5:
  - docs/V1_1_4_STATE_SNAPSHOT.md (score: 0.5149)
  - docs/AGENT_INTELLIGENCE_LAYER_REPORT.md (score: 0.4661)
  - docs/EMBEDDING_SECURITY_CONSTRAINTS.md (score: 0.4650)
  - docs/V1_2_0_PHASE_B0_ENV_PREP_REPORT.md (score: 0.4442)
  - docs/V1_2_0_EMBEDDING_ARCHITECTURE_DECISION.md (score: 0.4146)

**QQ005: Agent Dashboard Next.js shadcn/ui**
- Category: dashboard
- Expected: agent-dashboard/README.md, docs/V1_1_4_STATE_SNAPSHOT.md
- Recall@5: 0.0000
- Violations: 0
- Top 5:
  - docs/V1_2_0_RAG_MEMORY_PHASE_A_REPORT.md (score: 0.5543)
  - agents/model-router/SOUL.md (score: 0.5093)

**QQ006: RAG memory retrieval policy**
- Category: rag_memory
- Expected: agents/rag-memory/RAG_RETRIEVAL_POLICY.md
- Recall@5: 0.0000
- Violations: 0
- Top 5:
  - docs/V1_2_0_PHASE_A2_FINAL_SUMMARY.md (score: 0.6487)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A1_EVAL_REPORT.md (score: 0.6279)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A_REPORT.md (score: 0.6174)
  - docs/V1_2_0_PHASE_B_DEPENDENCY_PLAN.md (score: 0.5845)
  - docs/V1_2_0_PHASE_B0_ENV_PREP_REPORT.md (score: 0.5825)

**QQ007: token cost analysis Agent Intelligence**
- Category: token_cost
- Expected: docs/V1_1_4_STATE_SNAPSHOT.md
- Recall@5: 0.0000
- Violations: 0
- Top 5:
  - docs/templates/WEBGL_RUNTIME_QA_TEMPLATE.md (score: 0.4844)
  - UnityExamples/UNITY_WEBGL_MATERIAL_POLICY.md (score: 0.4497)

**QQ008: canary deployment pipeline v0.4.0**
- Category: canary_pipeline
- Expected: docs/V1_1_4_STATE_SNAPSHOT.md, docs/V1_1_4_RUNTIME_SANITY_REPORT.md
- Recall@5: 0.5000
- Violations: 0
- Top 5:
  - docs/V1_1_4_STATE_SNAPSHOT.md (score: 0.5976)
  - docs/AGENT_INTELLIGENCE_LAYER_REPORT.md (score: 0.5882)
  - docs/RUNBOOK.md (score: 0.5503)
  - docs/V1_2_0_EMBEDDING_ARCHITECTURE_DECISION.md (score: 0.5410)
  - docs/V1_2_0_PHASE_B0_ENV_PREP_REPORT.md (score: 0.5215)

**QQ009: Unity WebGL build verification 26 checks**
- Category: unity_webgl
- Expected: scripts/check-unity-webgl-build.js, docs/STASH_VALIDATION_REPORT.md
- Recall@5: 0.5000
- Violations: 0
- Top 5:
  - UnityExamples/JumpJumpTemplateDemo/WEBGL_BUILD_FIX_REPORT.md (score: 0.6454)
  - UnityExamples/_RuntimeVerifiedTemplate/WEBGL_BUILD_FIX_REPORT.md (score: 0.6454)
  - docs/STASH_VALIDATION_REPORT.md (score: 0.6402)
  - UnityExamples/BreakoutTemplateDemo/WEBGL_BUILD_VALIDATION_REPORT.md (score: 0.6290)
  - docs/HTTPS_WSS_SUPPLEMENTAL_QA_PLAN.md (score: 0.6289)

**QQ010: Five Iron Laws PartyGameSDK**
- Category: hard_constraints
- Expected: docs/V1_1_4_STATE_SNAPSHOT.md, docs/BASELINE.md
- Recall@5: 0.0000
- Violations: 0
- Top 5:
  - docs/V1_0_0_TAG_APPROVAL.md (score: 0.7234)
  - UnityExamples/_GameTemplateSkeleton/BUILD_GUIDE.md (score: 0.7108)
  - docs/V1_0_0_RELEASE_SUMMARY.md (score: 0.6960)
  - docs/MANUAL_DEVICE_QA_RESULT_TEMPLATE.md (score: 0.6742)
  - UnityExamples/SnakeTemplateDemo/GAME_SPEC.md (score: 0.6686)

**QQ011: agent runtime architecture v1.1.2**
- Category: agent_runtime
- Expected: docs/V1_1_4_STATE_SNAPSHOT.md
- Recall@5: 0.0000
- Violations: 0
- Top 5:
  - docs/AGENT_STUDIO_HIERARCHY.md (score: 0.7051)
  - docs/AGENT_DASHBOARD_PHASE_REPORT.md (score: 0.6755)
  - docs/V1_0_1_GOVERNANCE_REPORT.md (score: 0.6546)
  - docs/RUNTIME_ARTIFACT_POLICY.md (score: 0.6466)
  - docs/WORKFLOW_COMMANDS.md (score: 0.6396)

**QQ012: Git workflow rebase force push SSH key**
- Category: git_governance
- Expected: docs/STASH_VALIDATION_REPORT.md, memory/2026-05-25.md
- Recall@5: 0.5000
- Violations: 0
- Top 5:
  - docs/STASH_VALIDATION_REPORT.md (score: 0.5977)
  - docs/WEBGL_RUNTIME_AUTOMATION_PLAN.md (score: 0.5964)
  - docs/PATH_SCOPED_RULES.md (score: 0.5846)
  - docs/QA_MOBILE_LOG.md (score: 0.5608)
  - docs/RUNTIME_FAILURE_MATRIX.md (score: 0.5606)

**QQ013: Unity WebGL runtime pipeline WEBGL_RUNTIME_PIPELINE**
- Category: unity_webgl
- Expected: UnityExamples/WEBGL_RUNTIME_PIPELINE.md
- Recall@5: 1.0000
- Violations: 0
- Top 5:
  - docs/STASH_VALIDATION_REPORT.md (score: 0.6463)
  - UnityExamples/WEBGL_RUNTIME_PIPELINE.md (score: 0.6437)
  - docs/RUNTIME_ARTIFACT_POLICY.md (score: 0.6366)
  - docs/V1_1_4_STATE_SNAPSHOT.md (score: 0.6365)
  - docs/WORKFLOW_COMMANDS.md (score: 0.6122)

**QQ014: Material Policy URP Lit SimpleLit Unlit**
- Category: material_policy
- Expected: UnityExamples/UNITY_WEBGL_MATERIAL_POLICY.md
- Recall@5: 0.0000
- Violations: 0
- Top 5:
  - docs/V1_0_0_TAG_APPROVAL.md (score: 0.7370)
  - UnityExamples/_GameTemplateSkeleton/BUILD_GUIDE.md (score: 0.7130)
  - docs/V1_0_0_RELEASE_SUMMARY.md (score: 0.7123)
  - docs/MANUAL_DEVICE_QA_RESULT_TEMPLATE.md (score: 0.6980)
  - agents/rag-memory/RAG_RETRIEVAL_POLICY.md (score: 0.6891)

**QQ015: QClaw review prompt template**
- Category: rag_memory
- Expected: prompts/qclaw_review.prompt.md
- Recall@5: 0.0000
- Violations: 0
- Top 5:
  - docs/PATH_SCOPED_RULES.md (score: 0.5985)
  - UnityExamples/MULTI_GAME_WEBGL_BUILD_REPORT.md (score: 0.5868)
  - docs/V1_0_1_GOVERNANCE_REPORT.md (score: 0.5856)
  - docs/V1_1_4_STATE_SNAPSHOT.md (score: 0.5839)
  - docs/HTTPS_WSS_SUPPLEMENTAL_QA_PLAN.md (score: 0.5763)

**QQ016: Codex task decomposition prompt**
- Category: rag_memory
- Expected: prompts/codex_task.prompt.md
- Recall@5: 0.0000
- Violations: 0
- Top 5:
  - docs/V1_2_0_PHASE_A2_FINAL_SUMMARY.md (score: 0.5894)
  - docs/WEBGL_RUNTIME_AUTOMATION_PLAN.md (score: 0.5669)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A2_KEYWORD_IMPROVEMENT_REPORT.md (score: 0.5484)
  - docs/V1_2_0_PHASE_B_ENV_SETUP.md (score: 0.5434)
  - agents/rag-memory/SOUL.md (score: 0.5404)

**QQ017: Prometheus metrics Grafana dashboard Agent Dashboard**
- Category: dashboard
- Expected: docker/prometheus/prometheus.yml
- Recall@5: 0.0000
- Violations: 0
- Top 5:
  - docs/PRODUCTION_RELEASE_REPORT.md (score: 0.5585)
  - docs/V1_0_0_RELEASE_SUMMARY.md (score: 0.5257)
  - docs/V1_1_4_STATE_SNAPSHOT.md (score: 0.4908)
  - agents/model-router/SOUL.md (score: 0.4896)
  - UnityExamples/UNITY_WEBGL_MATERIAL_POLICY.md (score: 0.4615)

**QQ018: PostgreSQL pgvector RAG Memory v1.2.0 Phase B**
- Category: rag_memory
- Expected: docs/V1_2_0_RAG_MEMORY_PHASE_A_REPORT.md
- Recall@5: 1.0000
- Violations: 0
- Top 5:
  - docs/V1_2_0_PHASE_B_ENV_SETUP.md (score: 0.7980)
  - docs/V1_2_0_PHASE_A2_FINAL_SUMMARY.md (score: 0.7558)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A_REPORT.md (score: 0.7373)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A2_KEYWORD_IMPROVEMENT_REPORT.md (score: 0.7269)
  - docs/EMBEDDING_COST_MODEL.md (score: 0.6779)

**QQ019: Unity WebGL baseline v0.1.0 PartyGameSDK**
- Category: unity_webgl
- Expected: docs/BASELINE.md, PartyGameSDK-MVP/BASELINE.md
- Recall@5: 0.0000
- Violations: 0
- Top 5:
  - docs/V1_0_0_TAG_APPROVAL.md (score: 0.7295)
  - docs/V1_0_0_RELEASE_SUMMARY.md (score: 0.7014)
  - docs/RUNTIME_AUTOMATION_PHASE_REPORT.md (score: 0.6870)
  - docs/V1_0_1_GOVERNANCE_REPORT.md (score: 0.6853)
  - docs/PRODUCTION_RELEASE_REPORT.md (score: 0.6815)

**QQ020: server.js injection playerIndex PartyGameSDK protocol**
- Category: hard_constraints
- Expected: docs/V1_1_4_STATE_SNAPSHOT.md, docs/PROTOCOL_GENERALIZATION_REPORT.md
- Recall@5: 0.0000
- Violations: 0
- Top 5:
  - UnityExamples/_RuntimeVerifiedTemplate/BUILD_GUIDE.md (score: 0.6490)
  - UnityExamples/JumpJumpTemplateDemo/BUILD_GUIDE.md (score: 0.6490)
  - UnityExamples/AGENT_GAME_GENERATION_PROMPT.md (score: 0.6423)
  - docs/AGENT_DASHBOARD_PLAN.md (score: 0.6372)
  - docs/EMBEDDING_SECURITY_CONSTRAINTS.md (score: 0.6251)

### HYBRID

**QQ001: hard constraints server.js**
- Category: hard_constraints
- Expected: docs/V1_1_4_STATE_SNAPSHOT.md, agents/rag-memory/RAG_RETRIEVAL_POLICY.md
- Recall@5: 0.5000
- Violations: 0
- Top 5:
  - docs/V1_2_0_RAG_MEMORY_PHASE_A_REPORT.md (score: 0.8309)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A1_EVAL_REPORT.md (score: 0.7850)
  - docs/V1_1_4_STATE_SNAPSHOT.md (score: 0.7526)
  - agents/rag-memory/SOUL.md (score: 0.7447)
  - UnityExamples/_RuntimeVerifiedTemplate/WEBGL_BUILD_VALIDATION_REPORT.md (score: 0.6053)

**QQ002: Unity WebGL material policy**
- Category: material_policy
- Expected: UnityExamples/UNITY_WEBGL_MATERIAL_POLICY.md, docs/V1_1_4_STATE_SNAPSHOT.md
- Recall@5: 0.5000
- Violations: 0
- Top 5:
  - docs/V1_2_0_RAG_MEMORY_PHASE_A1_EVAL_REPORT.md (score: 0.8019)
  - UnityExamples/RUNTIME_VERIFIED_TEMPLATE_REPORT.md (score: 0.7884)
  - UnityExamples/UNITY_WEBGL_MATERIAL_POLICY.md (score: 0.7750)
  - UnityExamples/JumpJumpTemplateDemo/WEBGL_CURRENT_SCENE_VALIDATION_REPORT.md (score: 0.5500)
  - UnityExamples/_RuntimeVerifiedTemplate/WEBGL_CURRENT_SCENE_VALIDATION_REPORT.md (score: 0.5500)

**QQ003: stash validation report**
- Category: git_governance
- Expected: docs/STASH_VALIDATION_REPORT.md
- Recall@5: 1.0000
- Violations: 0
- Top 5:
  - docs/STASH_VALIDATION_REPORT.md (score: 0.8750)
  - UnityExamples/MULTI_GAME_WEBGL_BUILD_REPORT.md (score: 0.7450)
  - docs/V1_0_1_GOVERNANCE_REPORT.md (score: 0.7405)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A_REPORT.md (score: 0.7378)
  - UnityExamples/_RuntimeVerifiedTemplate/WEBGL_BUILD_FIX_REPORT.md (score: 0.7335)

**QQ004: release gate process**
- Category: release_gate
- Expected: prompts/release_gate.prompt.md, docs/V1_1_4_STATE_SNAPSHOT.md
- Recall@5: 0.0000
- Violations: 0
- Top 5:
  - docs/templates/RELEASE_GATE_REPORT_TEMPLATE.md (score: 0.8583)
  - docs/GOVERNANCE_LAYER_REPORT.md (score: 0.8068)
  - docs/AGENT_DASHBOARD_PHASE_REPORT.md (score: 0.7670)
  - docs/AGENT_STUDIO_HIERARCHY.md (score: 0.6658)
  - docs/WORKFLOW_COMMANDS.md (score: 0.6587)

**QQ005: Agent Dashboard Next.js shadcn/ui**
- Category: dashboard
- Expected: agent-dashboard/README.md, docs/V1_1_4_STATE_SNAPSHOT.md
- Recall@5: 0.5000
- Violations: 0
- Top 5:
  - docs/AGENT_DASHBOARD_PHASE_REPORT.md (score: 0.7699)
  - docs/V1_1_4_STATE_SNAPSHOT.md (score: 0.7553)
  - docs/AGENT_DASHBOARD_PLAN.md (score: 0.7067)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A_REPORT.md (score: 0.6660)
  - docs/AGENT_STUDIO_HIERARCHY.md (score: 0.5333)

**QQ006: RAG memory retrieval policy**
- Category: rag_memory
- Expected: agents/rag-memory/RAG_RETRIEVAL_POLICY.md
- Recall@5: 0.0000
- Violations: 0
- Top 5:
  - docs/V1_2_0_RAG_MEMORY_PHASE_A1_EVAL_REPORT.md (score: 0.8498)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A_REPORT.md (score: 0.8324)
  - docs/RAG_RETRIEVAL_POLICY.md (score: 0.7826)
  - docs/AGENT_INTELLIGENCE_LAYER_REPORT.md (score: 0.7641)
  - agents/rag-memory/SOUL.md (score: 0.7028)

**QQ007: token cost analysis Agent Intelligence**
- Category: token_cost
- Expected: docs/V1_1_4_STATE_SNAPSHOT.md
- Recall@5: 1.0000
- Violations: 0
- Top 5:
  - docs/AGENT_INTELLIGENCE_LAYER_REPORT.md (score: 0.8206)
  - docs/AGENT_DASHBOARD_PHASE_REPORT.md (score: 0.7955)
  - docs/V1_1_4_STATE_SNAPSHOT.md (score: 0.6742)
  - agents/token-cost/SOUL.md (score: 0.6415)
  - docs/AGENT_DASHBOARD_PLAN.md (score: 0.6350)

**QQ008: canary deployment pipeline v0.4.0**
- Category: canary_pipeline
- Expected: docs/V1_1_4_STATE_SNAPSHOT.md, docs/V1_1_4_RUNTIME_SANITY_REPORT.md
- Recall@5: 0.0000
- Violations: 0
- Top 5:
  - docs/V1_0_0_RELEASE_SUMMARY.md (score: 0.6781)
  - docs/templates/RELEASE_GATE_REPORT_TEMPLATE.md (score: 0.6012)
  - docs/GOVERNANCE_LAYER_REPORT.md (score: 0.5568)
  - docs/PRODUCTION_RELEASE_REPORT.md (score: 0.5515)
  - docs/WORKFLOW_COMMANDS.md (score: 0.4567)

**QQ009: Unity WebGL build verification 26 checks**
- Category: unity_webgl
- Expected: scripts/check-unity-webgl-build.js, docs/STASH_VALIDATION_REPORT.md
- Recall@5: 0.0000
- Violations: 0
- Top 5:
  - UnityExamples/JumpJumpTemplateDemo/WEBGL_BUILD_FIX_REPORT.md (score: 0.7700)
  - UnityExamples/_RuntimeVerifiedTemplate/WEBGL_BUILD_FIX_REPORT.md (score: 0.7700)
  - UnityExamples/JumpJumpTemplateDemo/WEBGL_BUILD_VALIDATION_REPORT.md (score: 0.7490)
  - UnityExamples/_RuntimeVerifiedTemplate/WEBGL_BUILD_VALIDATION_REPORT.md (score: 0.7490)
  - UnityExamples/BreakoutTemplateDemo/WEBGL_BUILD_VALIDATION_REPORT.md (score: 0.7381)

**QQ010: Five Iron Laws PartyGameSDK**
- Category: hard_constraints
- Expected: docs/V1_1_4_STATE_SNAPSHOT.md, docs/BASELINE.md
- Recall@5: 0.5000
- Violations: 0
- Top 5:
  - agents/rag-memory/SOUL.md (score: 0.9524)
  - agents/model-router/SOUL.md (score: 0.9522)
  - docs/STASH_VALIDATION_REPORT.md (score: 0.8528)
  - docs/V1_1_4_STATE_SNAPSHOT.md (score: 0.6000)
  - PARTY_GAME_SDK_FINAL_HANDOFF.md (score: 0.6000)

**QQ011: agent runtime architecture v1.1.2**
- Category: agent_runtime
- Expected: docs/V1_1_4_STATE_SNAPSHOT.md
- Recall@5: 1.0000
- Violations: 0
- Top 5:
  - docs/AGENT_DASHBOARD_PHASE_REPORT.md (score: 0.8262)
  - docs/V1_1_4_STATE_SNAPSHOT.md (score: 0.7375)
  - docs/AGENT_INTELLIGENCE_LAYER_REPORT.md (score: 0.7368)
  - docs/V1_0_1_GOVERNANCE_REPORT.md (score: 0.7148)
  - docs/AGENT_DASHBOARD_PLAN.md (score: 0.7127)

**QQ012: Git workflow rebase force push SSH key**
- Category: git_governance
- Expected: docs/STASH_VALIDATION_REPORT.md, memory/2026-05-25.md
- Recall@5: 0.5000
- Violations: 0
- Top 5:
  - docs/V1_2_0_RAG_MEMORY_PHASE_A1_EVAL_REPORT.md (score: 0.6250)
  - docs/ROLLBACK.md (score: 0.6073)
  - docs/STASH_VALIDATION_REPORT.md (score: 0.5016)
  - docs/V1_0_1_GOVERNANCE_REPORT.md (score: 0.4911)
  - docs/PRODUCTION_RELEASE_REPORT.md (score: 0.4906)

**QQ013: Unity WebGL runtime pipeline WEBGL_RUNTIME_PIPELINE**
- Category: unity_webgl
- Expected: UnityExamples/WEBGL_RUNTIME_PIPELINE.md
- Recall@5: 0.0000
- Violations: 0
- Top 5:
  - docs/STASH_VALIDATION_REPORT.md (score: 0.8194)
  - docs/GOVERNANCE_LAYER_REPORT.md (score: 0.7817)
  - docs/WORKFLOW_COMMANDS.md (score: 0.7250)
  - docs/WEBGL_RUNTIME_AUTOMATION_PLAN.md (score: 0.7244)
  - docs/templates/UNITY_BUILD_REPORT_TEMPLATE.md (score: 0.6821)

**QQ014: Material Policy URP Lit SimpleLit Unlit**
- Category: material_policy
- Expected: UnityExamples/UNITY_WEBGL_MATERIAL_POLICY.md
- Recall@5: 1.0000
- Violations: 0
- Top 5:
  - docs/RAG_RETRIEVAL_POLICY.md (score: 0.6333)
  - agents/rag-memory/SOUL.md (score: 0.4424)
  - UnityExamples/UNITY_WEBGL_MATERIAL_POLICY.md (score: 0.4417)
  - UnityExamples/GAME_TEMPLATE_FACTORY.md (score: 0.4223)
  - docs/templates/HOTFIX_REPORT_TEMPLATE.md (score: 0.3330)

**QQ015: QClaw review prompt template**
- Category: rag_memory
- Expected: prompts/qclaw_review.prompt.md
- Recall@5: 0.0000
- Violations: 0
- Top 5:
  - UnityExamples/UNITY_WEBGL_MATERIAL_POLICY.md (score: 0.6919)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A_REPORT.md (score: 0.5853)
  - docs/V1_1_4_STATE_SNAPSHOT.md (score: 0.5715)
  - UnityExamples/_RuntimeVerifiedTemplate/WEBGL_BUILD_FIX_REPORT.md (score: 0.5599)
  - UnityExamples/JumpJumpTemplateDemo/WEBGL_BUILD_FIX_REPORT.md (score: 0.5599)

**QQ016: Codex task decomposition prompt**
- Category: rag_memory
- Expected: prompts/codex_task.prompt.md
- Recall@5: 0.0000
- Violations: 0
- Top 5:
  - docs/V1_2_0_RAG_MEMORY_PHASE_A_REPORT.md (score: 0.7821)
  - docs/CODEX_QCLAW_HANDOFF.md (score: 0.7628)
  - agents/model-router/SOUL.md (score: 0.6790)
  - docs/WORKFLOW_COMMANDS.md (score: 0.6364)
  - docs/AGENT_STUDIO_HIERARCHY.md (score: 0.6116)

**QQ017: Prometheus metrics Grafana dashboard Agent Dashboard**
- Category: dashboard
- Expected: docker/prometheus/prometheus.yml
- Recall@5: 0.0000
- Violations: 0
- Top 5:
  - docs/V1_1_4_STATE_SNAPSHOT.md (score: 0.7969)
  - docs/AGENT_DASHBOARD_PLAN.md (score: 0.7409)
  - docs/V1_0_0_RELEASE_SUMMARY.md (score: 0.6929)
  - docs/PHASE_3_GRAFANA_READINESS_REPORT.md (score: 0.6746)
  - docs/AGENT_INTELLIGENCE_LAYER_REPORT.md (score: 0.6670)

**QQ018: PostgreSQL pgvector RAG Memory v1.2.0 Phase B**
- Category: rag_memory
- Expected: docs/V1_2_0_RAG_MEMORY_PHASE_A_REPORT.md
- Recall@5: 1.0000
- Violations: 0
- Top 5:
  - docs/V1_2_0_RAG_MEMORY_PHASE_A_REPORT.md (score: 0.8583)
  - docs/V1_1_4_STATE_SNAPSHOT.md (score: 0.8172)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A1_EVAL_REPORT.md (score: 0.7001)
  - docs/AGENT_DASHBOARD_PHASE_REPORT.md (score: 0.5288)
  - docs/RAG_RETRIEVAL_POLICY.md (score: 0.5153)

**QQ019: Unity WebGL baseline v0.1.0 PartyGameSDK**
- Category: unity_webgl
- Expected: docs/BASELINE.md, PartyGameSDK-MVP/BASELINE.md
- Recall@5: 0.0000
- Violations: 0
- Top 5:
  - docs/V1_1_4_STATE_SNAPSHOT.md (score: 0.7479)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A_REPORT.md (score: 0.7436)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A1_EVAL_REPORT.md (score: 0.7419)
  - docs/V1_0_0_RELEASE_SUMMARY.md (score: 0.7250)
  - docs/V1_0_1_GOVERNANCE_REPORT.md (score: 0.7234)

**QQ020: server.js injection playerIndex PartyGameSDK protocol**
- Category: hard_constraints
- Expected: docs/V1_1_4_STATE_SNAPSHOT.md, docs/PROTOCOL_GENERALIZATION_REPORT.md
- Recall@5: 0.5000
- Violations: 0
- Top 5:
  - agents/rag-memory/SOUL.md (score: 0.9655)
  - docs/V1_1_4_STATE_SNAPSHOT.md (score: 0.8917)
  - docs/STASH_VALIDATION_REPORT.md (score: 0.7353)
  - docs/RUNTIME_AUTOMATION_PHASE_REPORT.md (score: 0.6942)
  - docs/V1_2_0_RAG_MEMORY_PHASE_A1_EVAL_REPORT.md (score: 0.6934)

