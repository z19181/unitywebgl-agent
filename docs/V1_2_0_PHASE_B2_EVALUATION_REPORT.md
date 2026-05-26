# Phase B.2 多模式评估 — 结果与根本原因分析

## 目标
运行三模式检索评估（关键词 / 语义 / 混合），与关键词基准线对比。

## 结果（2026-05-25 23:27 PDT）

| 模式 | Recall@5 | Precision@5 | MRR | NDCG@5 | 违规 |
|---------|----------|-------------|------|--------|------------|
| 关键词 | 0.4500 | 0.1300 | 0.2971 | 0.2835 | 0 |
| 语义 | 0.0250 | 0.0100 | 0.0300 | 0.0193 | 0 |
| 混合 | 0.3250 | 0.0800 | 0.2002 | 0.2044 | 0 |

**目标（Phase B）：** Recall@5 ≥ 0.60，MRR ≥ 0.45 — **未达成。**

## 修复的 Bug

1. **`retrieve_semantic.js:65`** — `query.toLowerCase()` 使用了未定义的变量 `query`（参数名为 `queryOrEmbedding`）。修复：将关键词提取拆分，仅在输入为字符串时运行。
2. **`evaluate_all_modes_v3.mjs:56`** — 选项参数传递 `{ k: 10 }`，但函数签名为 `{ topK = 5 }`。修复：改为 `{ topK: 10 }`。
3. **`evaluate_all_modes_v3.mjs:63`** — 结果字段：`retrieveWithSnippets` 返回 `documentPath`/`bestSimilarity`，但评估代码期望的是 `path`/`score`。修复：增加归一化映射。

## 根本原因

语义检索效果极差（Recall@5 = 0.025）的核心原因是**分块质量，而非 embedding 质量。**

当前分块算法会产生仅含标题的分块（如 `## v1.2.0 Phase B — Semantic Retrieval`），长度不足 50 个字符，且无正文内容。这些分块在语义上与相关查询高度相似，但包含的信息量为零。同时，它们还能获得最高的余弦相似度得分（短文本 = 方向集中）。

**解决方案：** 修复分块，确保每个分块至少包含 200-300 个字符，并将标题与其下方的内容合并。

## 文件
- `evaluate_all_modes_v3.mjs` — 三模式评估脚本（ES module）
- `retrieve_semantic.js` — 已修复 `query.toLowerCase()` bug
- `eval_results_all_modes.json` — 63KB，全部 3 种模式 × 20 条查询的详细结果
- `eval_results_all_modes.md` — 28KB，Markdown 格式报告

## 下一步
修复分块 → 重新构建 pgvector → 重新运行评估。预计 Recall@5 可达 0.35-0.50 左右。
