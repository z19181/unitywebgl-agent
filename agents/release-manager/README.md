# PartyGameSDK Release Manager Agent

用途：
从 v0.4.2 推荐灰度基线推进到 v1.0.0。

启动方式：
让 Release Manager Agent 读取 RELEASE_STATE.json，然后执行当前 current_phase。

第一阶段：
phase_1_internal_qa

推荐启动命令：
请读取 RELEASE_STATE.json，并执行当前阶段。如果当前阶段是 phase_1_internal_qa，请开始内部 QA，不要新增功能，不要修改核心协议，只执行 QA、记录问题、必要时做 bugfix。
