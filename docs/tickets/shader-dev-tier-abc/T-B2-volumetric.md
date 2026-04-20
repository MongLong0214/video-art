# T-B2: Volumetric Sketch (Raymarched Fog / Clouds / Aurora)

**PRD Ref**: PRD-shader-dev-tier-abc > US-2 (AC-2.2)
**Priority**: P1 (Tier B)
**Size**: L (4-8h)
**Status**: Todo
**Depends On**: T0-a (no FBO float needed — just ray march)

---

## 1. Objective
Implement `?sketch=volumetric` sketch — a ray-marched volumetric fog/cloud scene with animated density field via 3D fbm noise. Aurora-like color gradients. Standalone (no source image).

## 2. Acceptance Criteria
- [ ] AC-1: `src/shaders/sketches/volumetric.frag` with front-to-back raymarch
- [ ] AC-2: 3D fbm noise field function (extend 2D fbm pattern from layer.frag)
- [ ] AC-3: Step count = 64 default (const `MAX_STEPS`), early termination on alpha ≥ 0.99
- [ ] AC-4: Color = `mix(skyColor, fogColor, 1-exp(-density*stepSize))` accumulated
- [ ] AC-5: Animated via `uTime` (cloud drift + density breathing)
- [ ] AC-6: `sketch-registry` entry: `{ width: 720, height: 1280, fps: 60, postProcessing: "default" }`
- [ ] AC-7: 45fps target (PRD §10.3). If not met, reduce step count to 48 + document
- [ ] AC-8: Seamless loop over `uLoopDuration` via TAU-normalized time

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases
| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `volumetric.frag: ray marching loop with MAX_STEPS` | Unit | Regex: `for .*i < MAX_STEPS` | FAIL |
| 2 | `volumetric.frag: 3D fbm function declared` | Unit | Regex: `float fbm3?\(vec3` | FAIL |
| 3 | `volumetric.frag: density-based color accumulation` | Unit | Regex: `exp\(-.*density\|color \+= ` | FAIL |
| 4 | `volumetric.frag: uTime used` | Unit | Regex: `uTime\|time \*` | FAIL |
| 5 | `sketch-registry: volumetric entry` | Unit | Key exists | FAIL |

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type |
|------|------------|
| `src/shaders/sketches/volumetric.frag` | Create |
| `src/shaders/sketches/volumetric.test.ts` | Create (regex tests) |
| `src/lib/sketch-registry.ts` | Add volumetric entry |
| `src/main.ts` | **Verify** glob auto-pickup works for fullscreen shader sketches (no FBO). If `createShaderSketch(name)` covers volumetric, no main.ts change. Otherwise add branch. |

### 4.2 Implementation Steps (Green Phase)
1. Red tests
2. `volumetric.frag`:
   ```glsl
   uniform float uTime;
   uniform vec2 uResolution;
   varying vec2 vUv;
   #define MAX_STEPS 64
   #define TAU 6.28318530718
   
   // 3D hash + value noise + fbm helpers (adapted from shader-dev procedural-noise)
   float hash31(vec3 p) { ... }
   float noise3(vec3 p) { ... }
   float fbm3(vec3 p) { ... }
   
   void main() {
     vec3 ro = vec3(0, 0, -2);
     vec3 rd = normalize(vec3((vUv-0.5)*uResolution/uResolution.y, 1.0));
     vec3 col = vec3(0);
     float alpha = 0;
     for (int i = 0; i < MAX_STEPS; i++) {
       vec3 p = ro + rd * (float(i) * 0.05 + uTime*0.2);
       float d = fbm3(p + uTime*0.1);
       float density = smoothstep(0.3, 0.8, d);
       vec3 c = mix(vec3(0.1,0.05,0.3), vec3(0.9,0.5,0.8), p.y*0.5+0.5);
       col += c * density * (1.0-alpha) * 0.1;
       alpha += density * 0.05;
       if (alpha > 0.99) break;
     }
     gl_FragColor = vec4(col, 1.0);
   }
   ```
3. Register in sketch-registry
4. Test → Green
5. Performance probe: browser FPS meter. If <45fps reduce MAX_STEPS

### 4.3 Refactor Phase
- Extract 3D noise helpers to `src/shaders/chunks/noise3d.glsl` (reuse in Tier C fractal-cave)

## 5. Edge Cases
- EC-1 (PRD E5): 720×1280 60fps target 미달 → lower step count to 48; document in JSDoc
- EC-2: Alpha saturation → early terminate (already handled)
- EC-3: Loop seam — uTime*0.1 and *0.2 must complete integer cycles per loopDuration. Use `time = fract(t/loopDur) * TAU` pattern

## 6. Review Checklist
- [ ] Red/Green PASS
- [ ] `check:shaders` PASS
- [ ] ≥45fps in browser
- [ ] Visual: volumetric fog/cloud-like
- [ ] Commit: `feat(sketch): T-B2 volumetric raymarch`
