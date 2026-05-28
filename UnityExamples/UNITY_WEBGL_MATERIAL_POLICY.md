# Unity WebGL Material Policy — v1.0.1-governance

**Version:** v1.0.1-governance  
**Scope:** All Unity WebGL game templates under PartyGameSDK  
**Authority:** Unity WebGL Game Agent + Codex Build Agent  
**Gate:** WebGL Material Validation (section 7)

---

## 1. Allowed Material Types

These materials and shaders are pre-validated for WebGL compatibility and may be used without additional verification.

| Material / Shader | WebGL | Mobile | Notes |
|---|---|---|---|
| Built-in Standard | ✅ | ⚠️ cautious | GPU-heavy on mobile; prefer Simple Lit |
| URP Lit | ✅ | ✅ | Recommended default |
| URP Simple Lit | ✅ | ✅ | Best for mobile performance |
| Mobile/Diffuse | ✅ | ✅ | Legacy; works everywhere |
| Unlit/Texture | ✅ | ✅ | No lighting overhead |
| Unlit/Color | ✅ | ✅ | Solid color, zero overhead |
| Sprite/Default | ✅ | ✅ | 2D default |
| Legacy/Diffuse | ✅ | ✅ | Fallback only |

---

## 2. Prohibited Materials / Shaders

These MUST NOT be used in WebGL game templates without explicit per-game approval and a WebGL validation report.

### 2.1 Pipeline-Incompatible

| Category | Reason |
|---|---|
| HDRP (all) | Not supported in WebGL. Instant black screen. |
| HDRP Lit / HDRP Lit Tessellation | HDRP exclusive. Impossible in WebGL. |
| Any `.shadergraph` referencing HDRP targets | Transitive incompatibility. |

### 2.2 Unverified Custom Shaders

| Category | Reason |
|---|---|
| Shader Graph (unverified) | Must pass Browser Runtime Check before template inclusion |
| Amplify Shader Editor (unverified) | Must pass Browser Runtime Check before template inclusion |
| AI-generated Shader (Claude/Codex/Copilot/Muse) | NEVER directly into template. See §9. |

### 2.3 WebGL-Breaking Features

| Feature | Why Prohibited |
|---|---|
| GrabPass | Not supported in WebGL 2.0 |
| Tessellation | Not supported in WebGL 2.0 |
| Compute Shader | Not available in WebGL 2.0 |
| Geometry Shader | Not available in WebGL 2.0 |
| Multi-Pass advanced effects | Each pass doubles draw calls; kills mobile FPS |
| Complex post-processing materials | Bloom/DOF/etc → massive GPU cost on mobile |
| Stencil buffer effects (complex) | Limited WebGL 2.0 support; test first |

---

## 3. Directory Standards

All new game template materials, textures, and shaders follow this layout:

```
UnityExamples/{GameName}TemplateDemo/
├── Assets/
│   ├── Art/
│   │   └── Generated/            ← AI-generated assets (not yet approved)
│   │       └── {date}-{batch}/
│   ├── Materials/
│   │   └── WebGLSafe/            ← Human-approved, WebGL-verified materials
│   │       └── MAT_WebGL_{Game}_{Purpose}_{Variant}.mat
│   ├── Textures/
│   │   └── WebGLSafe/            ← Human-approved, compressed textures
│   │       └── TEX_WebGL_{Game}_{Purpose}_{Size}.png
│   └── Shaders/
│       └── WebGLSafe/            ← Human-approved, browser-verified shaders
│           └── SHD_WebGL_{Purpose}.shader
```

---

## 4. Naming Convention

### Materials
```
MAT_WebGL_{Game}_{Purpose}_{Variant}.mat
```
Examples:
- `MAT_WebGL_Snake_Body_Green.mat`
- `MAT_WebGL_2048_Tile_2.mat`
- `MAT_WebGL_Breakout_Ball_Default.mat`

### Textures
```
TEX_WebGL_{Game}_{Purpose}_{Size}.png
```
Examples:
- `TEX_WebGL_Snake_BG_1024.png`
- `TEX_WebGL_2048_TileBG_512.png`

### Shaders
```
SHD_WebGL_{Purpose}.shader
```
Examples:
- `SHD_WebGL_Glow.shader`
- `SHD_WebGL_Outline.shader`

---

## 5. Texture Constraints

| Rule | Value |
|---|---|
| Mobile recommended | 512×512 |
| Default maximum | 1024×1024 |
| Prohibited (default) | 4096×4096 (4K) |
| Prohibited | Uncompressed textures directly in WebGL build |
| Compression | DXT/ETC2/ASTC per platform, Unity auto-handled |

### Enforcement

Code review / build check:
- [ ] No texture > 1024×1024 without documented reason
- [ ] No 4K textures in any template
- [ ] `TextureImporter` settings: `maxTextureSize ≤ 1024` (template default)
- [ ] Texture compression: `textureCompression = platformDefault`

---

## 6. Shader Rules

### Default Policy per New Game

| Use Case | Shader |
|---|---|
| 3D objects | URP Simple Lit |
| UI sprites | Sprite/Default |
| Solid color objects | Unlit/Color |
| Textured objects (no lighting) | Unlit/Texture |
| Simple lighting needed | URP Lit |

### Custom Shader Gate

Any custom shader (Shader Graph, Amplify, or hand-written) MUST pass the WebGL Material Validation Gate (§7) before inclusion in a game template. This applies to:

- Shader Graph `.shadergraph` assets
- Amplify Shader Editor `.shader` assets
- Hand-written HLSL/GLSL in `.shader` files
- AI-generated shaders (see §9)

### Shader Complexity Budget

| Metric | Budget per game | Budget per material |
|---|---|---|
| Shader passes | ≤ 2 | ≤ 1 |
| Keywords | ≤ 10 | ≤ 5 |
| Texture samples | ≤ 4 | ≤ 2 |
| Variant count | ≤ 256 | ≤ 64 |

---

## 7. WebGL Material Validation Gate

Every new game template MUST pass all 6 checks before release.

### 7.1 Editor Scene Check
- [ ] All GameObjects render correct materials in Editor Play Mode
- [ ] No pink (missing shader) materials in scene
- [ ] Console: 0 shader compile errors

### 7.2 WebGL Build Check
- [ ] `Unity -batchmode -executeMethod {Game}WebGLBuilder.BuildWebGL` succeeds
- [ ] No shader compile errors in build log
- [ ] No `Shader not supported` or `fallback to Hidden/InternalErrorShader` warnings

### 7.3 Browser Canvas Check
- [ ] Canvas renders — NOT black screen
- [ ] All game objects visible
- [ ] Colors match Editor appearance

### 7.4 Network Resource Check
- [ ] Chrome DevTools → Network → 0 errors for shader/material resources
- [ ] All `.data` / `.wasm` loads succeed

### 7.5 Console Error Check
- [ ] 0 shader compile errors in browser console
- [ ] 0 `GL_INVALID_OPERATION` errors
- [ ] 0 `failed to compile shader` messages

### 7.6 Mobile Smoke Test
- [ ] Safari (iOS) — canvas renders, no black screen
- [ ] Chrome (Android) — canvas renders, no black screen
- [ ] At least one mobile device verified

---

## 8. Codex Check Script

### `scripts/check-unity-materials.js` (planned)

Purpose: Automated pre-build material audit.

Checks:
```
1. No HDRP materials in Assets/
2. No unverified ShaderGraph/Amplify shaders
3. No textures > 1024×1024 without documented exception
4. No materials with missing shader references
5. No materials referencing "Hidden/" shaders
6. No pink material risk (referenced shader not found)
```

Usage:
```bash
node scripts/check-unity-materials.js UnityExamples/{GameName}TemplateDemo/
```

Exit code: 0 on pass, non-zero on violation.

---

## 9. AI / Muse Asset Rules

### Generated Assets

| Stage | Location | Status |
|---|---|---|
| AI Generation | `Assets/Art/Generated/{date}-{batch}/` | ⚠️ Not approved |
| Human Review | — | Awaiting approval |
| Approved | `Assets/Materials/WebGLSafe/` or `Assets/Textures/WebGLSafe/` | ✅ Production |

### Rules

1. AI-generated materials (Claude, Codex, Copilot, Unity Muse) MUST land in `Assets/Art/Generated/` first.
2. Human review required before promotion to `WebGLSafe/`.
3. AI-generated materials MUST NOT be used directly in production scenes.
4. Every AI-generated material MUST pass the WebGL Material Validation Gate (§7).
5. Shader code generated by AI MUST be flagged with `// AI-GENERATED — REQUIRES WEBGL VERIFICATION` comment.

---

## 10. Cross-Reference Updates

This policy is referenced by:
- `UnityExamples/GAME_TEMPLATE_FACTORY.md` §10.5 (Material Policy)
- `UnityExamples/AGENT_GAME_GENERATION_PROMPT.md` §Material Rules
- `docs/PATH_SCOPED_RULES.md` UNI-006 (Material Policy)

---

**Policy Version:** v1.0.1-governance  
**Effective Date:** 2026-05-24  
**Next Review:** v1.1.0 feature branch
