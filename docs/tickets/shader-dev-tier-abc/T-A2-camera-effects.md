# T-A2: Camera Effects (Lens Distortion / Barrel / Fisheye / DoF)

**PRD Ref**: PRD-shader-dev-tier-abc > US-1 (AC-1.3) + §4.4
**Priority**: P0 (Tier A)
**Size**: M (2-4h)
**Status**: Todo
**Depends On**: T0-a

---

## 1. Objective
Add `lensDistortionPass` as a new ShaderPass to `effect-composer.ts` covering **barrel/pincushion distortion** + **chromatic shift** + **radial DoF (simple blur by distance from center)**. Extends existing chromatic aberration usage.

## 2. Acceptance Criteria
- [ ] AC-1: New ShaderPass inserted in effect-composer.ts after `multipassFeedback`, before `kaleidoscope`
- [ ] AC-2: scene-schema adds `lensDistortionSchema`: `{ barrel: -0.5..0.5 (default 0), chromatic: 0..2 (default 0), dof: 0..1 (default 0), vignetteRadius: 0.5..1 (default 1) }` — backward compat
- [ ] AC-3: `barrel > 0` → pincushion (inward warp), `barrel < 0` → barrel (outward warp). Classic formula: `r' = r * (1 + k1*r^2 + k2*r^4)`
- [ ] AC-4: `chromatic > 0` → R/G/B channels sampled at slightly different radii from center
- [ ] AC-5: `dof > 0` → radial blur proportional to distance from center
- [ ] AC-6: All defaults 0 → pixel-identical to pre-T-A2
- [ ] AC-7: `npm run check:shaders` PASS

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases
| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `effect-composer: declares lensDistortion ShaderPass` | Unit | Source regex: `lensDistortion\|uBarrelAmount\|uLensChromatic` | FAIL |
| 2 | `effect-composer: uses Brown distortion formula r*(1+k1*r^2)` | Unit | Source regex: `1\.0 \+ .*r.*r\*r` | FAIL |
| 3 | `scene-schema: lensDistortion defaults` | Unit | parse empty → all defaults 0 or 1 | FAIL |
| 4 | `scene-schema: lensDistortion barrel range [-0.5, 0.5]` | Unit | barrel=0.6 → schema fail | FAIL |

### 3.2 Test File Location
- `src/lib/effect-composer.test.ts` (extend T-A1 test file)
- `src/lib/scene-schema.test.ts` (extend)

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type |
|------|------------|
| `src/lib/effect-composer.ts` | Add lensDistortion fragment shader const + ShaderPass insertion |
| `src/lib/scene-schema.ts` | Add lensDistortionSchema |
| `src/lib/effect-composer.test.ts` | Extend with new test cases |

### 4.2 Implementation Steps (Green Phase)
1. Red tests
2. Schema addition: `lensDistortionSchema`
3. GLSL shader:
   ```glsl
   uniform sampler2D inputBuffer;
   uniform float uBarrelAmount;
   uniform float uLensChromatic;
   uniform float uLensDoF;
   uniform float uVignetteRadius;
   varying vec2 vUv;
   vec2 distort(vec2 uv, float k) {
     vec2 c = uv - 0.5; float r2 = dot(c,c);
     return 0.5 + c * (1.0 + k*r2);
   }
   void main() {
     vec2 uvR = distort(vUv, uBarrelAmount * (1.0 + uLensChromatic*0.02));
     vec2 uvG = distort(vUv, uBarrelAmount);
     vec2 uvB = distort(vUv, uBarrelAmount * (1.0 - uLensChromatic*0.02));
     float r = texture2D(inputBuffer, uvR).r;
     float g = texture2D(inputBuffer, uvG).g;
     float b = texture2D(inputBuffer, uvB).b;
     // DoF: radial blur by distance
     float d = length(vUv - 0.5);
     float blurAmt = uLensDoF * smoothstep(0.0, 0.7, d);
     // 5-tap circular sample if blurAmt > 0
     gl_FragColor = vec4(r, g, b, 1.0);
   }
   ```
4. Pass insertion after multipassFeedback
5. Uniform wiring from config.effects.lensDistortion
6. Test → Green

### 4.3 Refactor Phase
- Share vignette logic with filmGrade pass if applicable (keep DRY)

## 5. Edge Cases
- EC-1: Extreme barrel (0.5 with DoF) → sampling outside [0,1] range. Use `clamp(uv, 0, 1)` or texture wrap=clamp
- EC-2: Chromatic + multipassFeedback chain — double chromatic. OK, intended stacking
- EC-3: DoF with small blurAmt — edge cases (division by 0) — guard `max(blurAmt, 1e-4)`

## 6. Review Checklist
- [ ] Red/Green/Refactor
- [ ] `check:shaders` PASS
- [ ] **File size**: `effect-composer.ts` ≤ 800 LOC after T-A1+T-A2 (est. ≤ 650)
- [ ] **Schema size**: `scene-schema.ts` ≤ 400 LOC after Tier A (current ~270 + 2 schemas)
- [ ] Manual: barrel=0.3 visible pincushion. barrel=-0.3 visible barrel
- [ ] chromatic=1.5 visible RGB separation
- [ ] All defaults → no visual change on 16 presets
- [ ] Commit: `feat(shader): T-A2 camera effects (barrel + chromatic + DoF)`
