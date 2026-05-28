# Release Manager Workflow

## 输入
- RELEASE_STATE.json
- PARTY_GAME_SDK_FINAL_HANDOFF.md
- docs/DEPLOYMENT_CHECKLIST.md
- docs/RUNBOOK.md
- docs/ROLLBACK.md
- docs/CANARY_PLAN.md
- docs/QA_MOBILE_LOG.md
- docs/MANUAL_DEVICE_QA_CHECKLIST.md
- docs/MANUAL_DEVICE_QA_RESULT_TEMPLATE.md

## 输出
- PHASE_1_QA_REPORT.md
- PHASE_1_MANUAL_QA_GATE_REPORT.md
- PHASE_2_CANARY_1_PERCENT_REPORT.md
- PHASE_3_CANARY_10_PERCENT_REPORT.md
- PHASE_4_CANARY_50_PERCENT_REPORT.md
- PRODUCTION_RELEASE_REPORT.md
- 更新后的 RELEASE_STATE.json

## ⛔ Phase 1 → Phase 2 唯一推进 Gate

Release Manager **不允许仅凭自动化测试进入 Phase 2**。

推进到 Phase 2 的唯一合法路径：

1. 人工完成 `docs/MANUAL_DEVICE_QA_CHECKLIST.md` 中的 27 项真机测试
2. 人工将结果填入 `docs/MANUAL_DEVICE_QA_RESULT_TEMPLATE.md`
3. 运行验证脚本:
   ```
   node scripts/phase1-device-qa-summary.js
   ```
4. **只有脚本输出 `PHASE_1_MANUAL_QA_APPROVED=true` 才允许推进**
5. 更新 RELEASE_STATE.json:
   - `current_phase = "phase_2_canary_1_percent"`
   - `last_passed_phase = "phase_1_internal_qa"`
   - `status = "ready_for_canary_1_percent"`
   - `requires_human_approval = true`
6. 生成 `PHASE_1_MANUAL_QA_GATE_REPORT.md`

如果脚本输出 false:
- `current_phase` 保持 `"phase_1_internal_qa"`
- `status = "manual_device_validation_required"`
- `requires_human_approval = true`
- `blocking_issues` 记录未通过原因

## 自动推进原则
Phase 2→3→4→5 阶段按自动化测试结果推进。
如果出现小型 bug，自动创建 bugfix 分支并修复。
如果连续失败 2 次，停止并请求人工确认。
如果涉及生产回滚、核心协议、五条铁律、安全密钥、生产域名、v1.0.0 tag，必须请求人工确认。

## 禁止事项
- **禁止仅凭自动化测试通过就推进 Phase 1 → Phase 2**
- 禁止跳过 Manual QA Gate
- 禁止修改核心协议
- 禁止修改五条铁律
- 禁止让 controller 发送 playerIndex
- 禁止让 server 理解 game_message.type
- 禁止绕过 existing room lifecycle
- 禁止未测试就推进阶段
