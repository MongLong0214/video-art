# T-A1: Multipass Feedback ShaderPass (Warp + Decay + Hue-Shift)

**PRD Ref**: PRD-shader-dev-tier-abc > US-1 (AC-1.2) + §4.4 (OQ-2 resolution)
**Priority**: P0 (Tier A core)
**Size**: M (2-4h)
**Status**: Todo
**Depends On**: T0-a

---

## 1. Objective
Extend existing `effect-composer.ts` feedback infrastructure with a new `multipassFeedbackPass` that samples the previous frame with radial warp + chromatic decay, accumulating prior frames with time-varying distortion. Distinct from simple `trails` mix.

## 2. Acceptance Criteria
- [ ] AC-1: New ShaderPass added in `effect-composer.ts`, inserted AFTER existing trails pass (which is at end of chain per original composer convention). Actual order: `... kaleidoscope → filmGrade → trails → lensDistortion → multipassFeedback` (all feedback-dependent passes at end). See PRD §4.4 OQ-2 resolution.
- [ ] AC-2: `scene-schema.ts` adds `multipassFeedbackSchema`: `{ strength: 0..0.95 (default 0), warp: 0..1 (default 0.2), decay: 0..1 (default 0.9), hueShift: 0..1 (default 0) }` with defaults → backward compat
- [ ] AC-3: Uniform `uFeedbackStrength=0` produces **pixel-identical** output to pre-T-A1 (verified by `pixel-regression` in T-A3)
- [ ] AC-4: Uniform `uFeedbackStrength=0.7, warp=0.3` produces visible swirling trail over successive frames (visual check)
- [ ] AC-5: Shares `feedbackTarget` with existing trails pass (**no new WebGLRenderTarget allocation** — verified by regex test on effect-composer.ts: count of `new THREE.WebGLRenderTarget` must remain 1)
- [ ] AC-5a: **Cleanup test** — extend existing dispose hook at effect-composer.ts:482 still fires on unmount (no additional dispose calls needed since target is shared)
- [ ] AC-6: `npm run check:shaders` PASS after edit
- [ ] AC-7: Existing 16 presets (3 killer + 13 solo) continue to load + parse (schema backward-compat verified)

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases
| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `effect-composer: declares multipassFeedback ShaderPass` | Unit | Source regex: `multipassFeedback|uFeedbackStrength` | FAIL |
| 2 | `effect-composer: pass order kaleidoscope → trails → multipassFeedback` | Unit | Index of uSegments < uTrailStrength < uFeedbackStrength in addPass call order (trails-family passes at end of chain) | FAIL |
| 3 | `scene-schema: multipassFeedback default values` | Unit | Parse empty effects → assert multipassFeedback.strength === 0 | FAIL |
| 4 | `scene-schema: multipassFeedback validates max strength 0.95` | Unit | strength=1.0 → schema parse fail | FAIL |
| 5 | `presets test: all 16 existing presets still parse under v3 schema` | Integration | iterate presets/ → sceneSchema.parse OK | PASS (backward compat) |

### 3.2 Test File Location
- `src/lib/effect-composer.test.ts` (create or extend)
- `src/lib/scene-schema.test.ts` (create or extend existing layer-frag.test.ts style)
- `src/lib/presets.test.ts` (already exists — no change needed, auto-validates)

### 3.3 Mock/Setup
- vitest, Three.js not required for source regex tests
- Visual verification via `npm run pipeline:preview` + `?scene=/presets/solo/T13-baseline.json` with manual uniform override

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `src/lib/effect-composer.ts` | Modify | Add `multipassFeedbackFragmentShader` GLSL + ShaderPass wiring |
| `src/lib/scene-schema.ts` | Modify | Add `multipassFeedbackSchema` to `effectsSchema` with defaults |
| `src/lib/effect-composer.test.ts` | Create | Shader source regex tests |
| `public/scene.json` | Modify | Optional: add `multipassFeedback: { strength: 0 }` explicit default (backward compat test) |

### 4.2 Implementation Steps (Green Phase)
1. Red tests
2. Add `multipassFeedbackSchema` z.object to scene-schema.ts + default + include in effectsSchema
3. Add GLSL const `multipassFeedbackFragmentShader` in effect-composer.ts:
   ```glsl
   uniform sampler2D inputBuffer;
   uniform sampler2D uPrevFrame;
   uniform float uFeedbackStrength;
   uniform float uFeedbackWarp;
   uniform float uFeedbackDecay;
   uniform float uFeedbackHueShift;
   uniform float uTime;
   varying vec2 vUv;
   // HSV helpers (hue shift)
   // main: sample prev with warp offset (radial sin/cos × warp), decay, hue-rotate, mix(current, warped, strength)
   ```
4. Insert pass after trails pass, before kaleidoscope (same feedbackTarget write)
5. Set uniforms from `config.effects.multipassFeedback`
6. Run tests → Green
7. Manual visual: tweak one solo preset to `multipassFeedback.strength: 0.7` → preview in browser

### 4.3 Refactor Phase
- Extract HSV helpers (rgb2hsv/hsv2rgb) to shared chunk (if duplicated across aura/multipass)

## 5. Edge Cases
- EC-1 (E3 from PRD): First frame — prevFrame is zero-initialized → output = current (strength*0 = no contribution). Warmup loop in `__startCapture` handles seam.
- EC-2: strength=0.95 + warp=1 → potentially runaway feedback (ever-brightening). Clamp final output `clamp(rgb, 0, 1.2)` to prevent
- EC-3: feedbackTarget resolution mismatch after window resize → handled by existing composer resize logic (no new code)

## 6. Review Checklist
- [ ] Red/Green/Refactor cycle complete
- [ ] `npm run check:shaders` PASS (new composer + shader)
- [ ] **File size**: `effect-composer.ts` ≤ 800 LOC after Tier A1 (current 490 + ~50-80 new = ≤ 570)
- [ ] Regex test: `grep -c "new THREE.WebGLRenderTarget" src/lib/effect-composer.ts` == 1 (feedbackTarget reuse)
- [ ] 16 existing presets parse under v3 schema
- [ ] Manual: `?scene=/presets/solo/T13-baseline.json` unchanged with strength=0
- [ ] Manual: override strength=0.7 → swirling trail visible
- [ ] Commit: `feat(shader): T-A1 multipass feedback (warp+decay+hueShift)`
