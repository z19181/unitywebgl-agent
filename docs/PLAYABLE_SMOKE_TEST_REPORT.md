# Playable Smoke Test Report

## Summary

PASS. The socket chain, Unity receiver path, and a visible on-screen reaction were confirmed end-to-end.

## Session

- Room ID: `EFA53A`
- Screen URL: `http://127.0.0.1:3000/screen/?roomId=EFA53A`
- Controller URL: `http://127.0.0.1:3000/controller?room=EFA53A`

## Verified Paths

- Socket PASS: controller -> server -> screen
- Unity receiver PASS: `JumpJumpGameManager` received `input.charge_start` and `input.charge_end`
- Build PASS: Unity WebGL batch build completed successfully
- Check PASS: `node scripts/check-unity-webgl-build.js UnityExamples/JumpJumpTemplateDemo/WebGLBuild` -> `26/26 checks passed`

## Visible Reaction

- PASS: the screen displayed a centered banner reading `Unity received input.charge_end • P0` after controller input
- PASS: the banner changed from the default waiting state on the first input path

## Known Limitation

- Live Unity -> JS ACK is still not reliable on this build path
- The actual Unity canvas did not surface a stable in-canvas debug overlay during this test, so the visible proof was provided by the screen-side banner while the Unity receiver logs confirmed the input path

## Files Changed

- `/Users/applemima1111/.qclaw/workspace/PartyGameSDK-MVP/UnityExamples/JumpJumpTemplateDemo/Assets/Scripts/Game/JumpJumpGameManager.cs`
- `/Users/applemima1111/.qclaw/workspace/PartyGameSDK-MVP/screen/index.html`

## Final Status

PASS
