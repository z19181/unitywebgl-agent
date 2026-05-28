# Phase 1 → Phase 2 Gate Formalization

**时间:** 2026-05-23 06:39 PDT

---

## 变更摘要

将 Manual QA Gate 确认为 Phase 1 → Phase 2 的唯一合法推进路径。

## 更新文件

| 文件 | 变更 |
|---|---|
| `agents/release-manager/SOUL.md` | Phase 1 拆分为 Step A(自动)+Step B(手动)，新增 Gate 唯一推进规则 |
| `docs/RELEASE_MANAGER_WORKFLOW.md` | 新增 Manual QA Gate 章节，更新输入/输出列表 |
| `RELEASE_STATE.json` | 新增 `manual_qa_gate` 顶级对象（要求/通过/拒绝/报告），修复 JSON 结构 |
| `PHASE_1_QA_REPORT.md` | 新增 §11 Manual QA Gate 章节（定义/通过条件/动作/当前状态） |

## Gate 规则

- Release Manager **不允许仅凭自动化测试**进入 Phase 2
- 必须存在人工填写的 `MANUAL_DEVICE_QA_RESULT_TEMPLATE.md`
- 必须运行 `node scripts/phase1-device-qa-summary.js`
- 只有 `PHASE_1_MANUAL_QA_APPROVED=true` 才允许推进
- 任何绕过此 Gate 的行为均视为违规

## 验证结果

- JSON: Valid
- SOUL.md: 3 gate references
- WORKFLOW.md: 3 gate references
- PHASE_1_QA_REPORT.md: §11 Gate chapter present
- Summary script: correctly rejects unfilled template
