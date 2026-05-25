# RAG Retrieval Policy (v1.2.0 Phase A)

> **Status:** DRAFT — Minimal Retrieval Loop (keyword + simple scoring)
>
> **Owner:** `rag-memory` agent
>
> **Scope:** `agents/rag-memory/`, `prompts/`, `docs/`, `UnityExamples/*.md`

---

## 1. Retrieval Targets (检索对象)

### 1.1 必须索引的目录

| Directory | Priority | Notes |
|-----------|-----------|-------|
| `docs/` | **HIGH** | 所有 .md 文件（32 个） |
| `agents/` | **HIGH** | 所有 agent 的 SOUL.md + IMPLEMENTATION.md |
| `UnityExamples/*.md` | **MEDIUM** | Material Policy、Build 报告等 |
| 根目录 `*.md` | **MEDIUM** | README.md、CHANGELOG.md、LICENSE 等 |
| `prompts/` | **LOW** | Prompt 模板（Phase A 新增） |

### 1.2 必须排除的文件

| Pattern | Reason |
|---------|--------|
| `node_modules/` | 依赖库 |
| `.git/` | Git 历史 |
| `UnityExamples/**/Library/` | Unity 缓存 |
| `agent-dashboard/node_modules/` | Dashboard 依赖 |
| `*.log` | 日志文件 |
| `*.tmp` | 临时文件 |
| `.qclaw_handoff/` | 交接包（已在 IMA 知识库） |

---

## 2. Chunk 策略 (Chunk Strategy)

### 2.1 当前策略（Phase A — Minimal）

**方法：按文件索引（file-level chunking）**

- 每个文件作为一个 chunk
- Chunk ID = 文件的绝对路径（relative to project root）
- Chunk 内容 = 文件全文（UTF-8）
- Chunk metadata = `{ path, size, mtime, sections }`

**为什么不用 semantic chunking？**
- Phase A 是 minimal loop，目标是验证检索流程
- Semantic chunking 需要 embedding API（Phase B）
- File-level chunking 足够验证 RAG 基础设施

### 2.2 未来策略（Phase B — Embedding）

**方法：按 section 索引（section-level chunking）**

- 每个 Markdown 文件按 `##` 分割为 sections
- Chunk ID = `{path}#section-title`
- Chunk 内容 = section 全文
- Chunk metadata = `{ path, section_title, section_index, token_count }`

**优势：**
- 更精细的检索（只返回相关 section，不返回整个文件）
- 更低 token 消耗（只注入相关 section）
- 更高准确率（减少无关内容干扰）

---

## 3. Top-k 策略 (Top-k Strategy)

### 3.1 当前策略（Phase A — Minimal）

**k = 5**（固定值）

- 返回 top 5 匹配文档
- 按 score 降序排列
- 如果 score 相同，按 `mtime` 降序（更新的文档优先）

### 3.2 未来策略（Phase B — Embedding）

**k = dynamic**（基于 query 复杂度）

- 简单 query（<5 keywords）：k = 3
- 中等 query（5-10 keywords）：k = 5
- 复杂 query（>10 keywords 或 phrase query）：k = 8
- 如果 top chunk score < 0.5：返回 "No relevant documents found"

---

## 4. Freshness 优先级 (Freshness Priority)

### 4.1 规则

**Freshness 权重 = 0.3 * normalized_freshness**

- `normalized_freshness = (mtime - oldest_mtime) / (newest_mtime - oldest_mtime)`
- 范围：[0, 1]，1 = 最新，0 = 最旧
- Freshness 权重加到 score 上（不是乘法）

### 4.2 为什么 freshness 重要？

- 项目快速迭代（v0.1.0 → v1.2.0）
- 旧文档可能过时（如 v0.1.0 的 BASELINE.md 仍然有效，但 v0.2.0 的文档可能已被 v1.0.0 取代）
- Freshness 帮助优先返回最新文档

### 4.3 Freshness 不覆盖 Hard Constraints

**Hard Constraints 永远优先于 Freshness**

- 如果 query = "server.js 怎么修改？"
- RAG 必须返回 Hard Constraints（server.js 不可修改）
- 即使有旧文档建议修改 server.js，也必须被过滤

---

## 5. Hard Constraints 永远优先 (Hard Constraints Always Win)

### 5.1 不可违反的约束

| # | Constraint | Source of Truth |
|---|------------|-----------------|
| 1 | **Do NOT modify `server.js`** | `AGENT_RULES.md`, `memory/2026-05-25.md` |
| 2 | **Do NOT modify PartyGameSDK protocol** | `BASELINE.md`, `PROTOCOL_GENERALIZATION_REPORT.md` |
| 3 | **Do NOT parse `game_message.type`** | Five Iron Laws (Law 3) |
| 4 | **Do NOT inject `playerIndex` from controller** | Five Iron Laws (Law 1) |
| 5 | **`RELEASE_STATE.json` only modified in release phase** | `RELEASE_STATE.json` |
| 6 | **Git tags require human approval** | `AGENT_RULES.md` |
| 7 | **Five Iron Laws must be preserved** | `BASELINE.md` |
| 8 | **Unity WebGL materials must be WebGL-safe** | `UNITY_WEBGL_MATERIAL_POLICY.md` |
| 9 | **Do NOT redo Unity WebGL baseline** | `PARTY_GAME_SDK_FINAL_HANDOFF.md` |

### 5.2 RAG 必须强制执行 Hard Constraints

**如果 RAG 检索到违反 Hard Constraints 的文档：**
1. 过滤该文档（不返回给 Agent）
2. 返回 Hard Constraints 文档（如 `AGENT_RULES.md`）
3. 在返回结果中标注 "⚠️ Hard Constraints applied"

**示例：**
```
Query: "怎么修改 server.js 添加新功能？"

Retrieval Result:
1. ⚠️ Hard Constraints applied
2. Source: AGENT_RULES.md
3. Content: "Do NOT modify server.js (Absolute)"
4. Reason: Query asks to modify server.js, which violates Hard Constraint #1
```

### 5.3 RAG 不允许覆盖 Hard Constraints

**禁止行为：**
- ❌ RAG 返回 "虽然 AGENT_RULES.md 说不要修改 server.js，但你可以..."

❌ RAG 返回 "我找到了一个旧文档建议使用 v0.2.0 的 server.js，你可以试试..."

❌ RAG 返回 "Five Iron Laws 可能过时了，我们可以重新讨论..."

**正确行为：**
- ✅ RAG 返回 Hard Constraints 文档
- ✅ RAG 返回 "该操作违反 Hard Constraint #X"
- ✅ RAG 拒绝提供违反 Hard Constraints 的建议

---

## 6. 不允许 RAG 覆盖 Five Iron Laws

### 6.1 Five Iron Laws（摘要）

1. **Controller 只发输入，不发送 `playerIndex`**
2. **Server 分配并注入 `playerIndex`，验证角色权限**
3. **Screen/Unity 负责游戏逻辑，仅转发不计算**
4. **Unity 广播状态变更**
5. **Controller 更新 UI 展示**

### 6.2 RAG 必须保护 Five Iron Laws

**如果检索到违反 Five Iron Laws 的内容：**
1. 过滤该内容
2. 返回 `BASELINE.md`（包含 Five Iron Laws 完整描述）
3. 标注 "⚠️ Five Iron Laws applied"

### 6.3 验证方法

**测试 query：**
```
"怎么让 controller 直接发送 playerIndex？"
```

**期望结果：**
```
⚠️ Five Iron Laws applied
Source: BASELINE.md
Content: "Law 1: Controller 只发输入，不发送 playerIndex"
Reason: Query asks to violate Law 1
```

---

## 7. 不允许 RAG 建议修改 server.js / 协议 / RELEASE_STATE.json

### 7.1 禁止建议修改的对象

| Object | Reason |
|--------|--------|
| `server.js` | 核心协议路由，修改会破坏所有游戏 |
| `PartyGameSDK` 协议（`game_message.type` 透明） | 协议泛化验证 38/38 PASS，不可回退 |
| `RELEASE_STATE.json` | 发布门禁，只能在 release phase 修改 |

### 7.2 RAG 必须拒绝的建议类型

| Query Type | RAG 响应 |
|------------|-----------|
| "怎么修改 server.js 添加 X 功能？" | ❌ 拒绝，返回 Hard Constraint #1 |
| "我们可以改协议让 server 解析 game_message.type 吗？" | ❌ 拒绝，返回 Hard Constraint #2 |
| "RELEASE_STATE.json 可以手动编辑吗？" | ❌ 拒绝，返回 Hard Constraint #5 |
| "server.js 的 `handleMessage` 函数可以优化吗？" | ❌ 拒绝，返回 Hard Constraint #1 |
| "我找到了一个旧版本 server.js，可以回退吗？" | ⚠️ 警告，v0.1.0 是基线，不可修改 |

### 7.3 允许的查询类型

| Query Type | RAG 响应 |
|------------|-----------|
| "server.js 的当前实现是什么？" | ✅ 返回 `server/server.js` 的只读描述 |
| "PartyGameSDK 协议的设计理念是什么？" | ✅ 返回 `BASELINE.md` + `PROTOCOL_GENERALIZATION_REPORT.md` |
| "RELEASE_STATE.json 的当前状态是什么？" | ✅ 返回 `RELEASE_STATE.json` 的只读内容 |
| "为什么 server.js 不能修改？" | ✅ 返回 Hard Constraints 文档 |

---

## 8. 检索质量指标 (Retrieval Quality Metrics)

### 8.1 Phase A 指标（Minimal）

| Metric | Target | Measurement |
|--------|---------|-------------|
| **Recall@5** | > 0.8 | 5/5 relevant documents retrieved |
| **Precision@5** | > 0.6 | 3/5 retrieved documents are relevant |
| **MRR (Mean Reciprocal Rank)** | > 0.7 | Average reciprocal rank of first relevant document |

### 8.2 Phase B 指标（Embedding）

| Metric | Target | Measurement |
|--------|---------|-------------|
| **Recall@5** | > 0.9 | 5/5 relevant documents retrieved |
| **Precision@5** | > 0.8 | 4/5 retrieved documents are relevant |
| **MRR** | > 0.85 | Average reciprocal rank of first relevant document |
| **NDCG@5** | > 0.85 | Normalized Discounted Cumulative Gain |

### 8.3 评估方法

**Ground truth 数据集：**
- 创建 `agents/rag-memory/test_queries.json`
- 每个 query 有 5 个 relevant documents（手动标注）
- 定期运行 `agents/rag-memory/evaluate_retrieval.js`

**示例：**
```json
{
  "query": "Unity WebGL material policy",
  "relevant_docs": [
    "UnityExamples/UNITY_WEBGL_MATERIAL_POLICY.md",
    "docs/V1_1_4_STATE_SNAPSHOT.md",
    "docs/STASH_VALIDATION_REPORT.md"
  ]
}
```

---

## 9. 索引更新策略 (Index Update Strategy)

### 9.1 Phase A 策略（Manual）

**触发条件：**
- 新增/修改 `docs/*.md`
- 新增/修改 `agents/*/SOUL.md`
- 新增/修改 `UnityExamples/*.md`
- 手动运行 `node agents/rag-memory/build_index.js`

**流程：**
1. 删除 `agents/rag-memory/index.json`
2. 重新扫描所有目标目录
3. 生成新的 `index.json`
4. 输出统计信息（文件数、chunk 数、大小）

### 9.2 Phase B 策略（Automatic）

**触发条件：**
- Git commit（`post-commit` hook）
- Git merge（`post-merge` hook）
- 手动编辑文件（FileSystemWatcher）

**流程：**
1. 检测变更文件（`git diff HEAD~1 --name-only`）
2. 增量更新 `index.json`（只重新索引变更文件）
3. 如果 embedding 已生成，只重新计算变更文件的 embedding
4. 输出增量更新报告

---

## 10. 安全与隐私 (Security & Privacy)

### 10.1 禁止索引的文件

| Pattern | Reason |
|---------|--------|
| `.env` | 环境变量（API keys、secrets） |
| `.ssh/` | SSH 私钥 |
| `*.pem` | 证书 |
| `*.key` | 密钥 |
| `credentials.json` | 凭据 |
| `secrets.yml` | Secrets |

### 10.2 禁止返回的内容

| Content Type | Action |
|--------------|--------|
| API keys | 过滤，返回 "[REDACTED]" |
| SSH keys | 过滤，返回 "[REDACTED]" |
| Passwords | 过滤，返回 "[REDACTED]" |
| Personal data | 过滤，返回 "[REDACTED]" |

### 10.3 审计日志

**所有检索操作必须记录：**
- Timestamp
- Query
- Retrieved documents (paths only, not content)
- Score
- Hard Constraints applied (if any)

**日志位置：**
```
agents/rag-memory/logs/retrieval_YYYY-MM-DD.log
```

---

## Appendix A: Quick Reference

**Key paths:**
```
PartyGameSDK-MVP/
├── agents/rag-memory/
│   ├── RAG_RETRIEVAL_POLICY.md   # This file
│   ├── build_index.js              # Index builder (Phase A)
│   ├── query_index.js              # Query script (Phase A)
│   ├── test_rag_memory.js          # Test script (Phase A)
│   ├── index.json                  # Generated index (Phase A)
│   └── logs/                      # Retrieval audit logs
├── prompts/                        # Prompt templates (Phase A)
│   ├── rag_retrieval.prompt.md
│   ├── codex_task.prompt.md
│   ├── qclaw_review.prompt.md
│   └── release_gate.prompt.md
└── docs/
    └── V1_2_0_RAG_MEMORY_PHASE_A_REPORT.md  # Phase A report
```

**Key commands:**
```bash
# Build index
node agents/rag-memory/build_index.js

# Query index
node agents/rag-memory/query_index.js "Unity WebGL material policy"

# Run tests
node agents/rag-memory/test_rag_memory.js

# View index stats
cat agents/rag-memory/index.json | jq '.stats'

# View retrieval logs
cat agents/rag-memory/logs/retrieval_$(date +%Y-%m-%d).log
```

---

**End of RAG Retrieval Policy**

> **Next Phase:** Phase B — Embedding + pgvector + Semantic Chunking
>
> **Blockers:** None (Phase A is minimal, no external dependencies)
>
> **ETA:** 2026-05-25 (same day)
