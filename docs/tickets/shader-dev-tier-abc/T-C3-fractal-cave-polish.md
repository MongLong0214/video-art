# T-C3: Fractal Cave Polish (SDF Tricks + CSG Boolean + Morphing)

**PRD Ref**: PRD-shader-dev-tier-abc > US-3 (AC-3.2, AC-3.5) + OQ-1 resolution
**Priority**: P1
**Size**: M (2-4h)
**Status**: Todo
**Depends On**: T-C2

---

## 1. Objective
Complete Tier C bundle: add proper `smoothUnion / smoothSubtract / smoothIntersect` (csg-boolean-operations), domain repetition tricks (sdf-tricks), and animated scene morphing. This ticket delivers the "100% csg + sdf-tricks" coverage.

## 2. Acceptance Criteria
- [ ] AC-1: Section 1 contains **all three** CSG functions per OQ-1:
  - `float smoothUnion(float d1, float d2, float k)` — IQ formula
  - `float smoothSubtract(float d1, float d2, float k)`
  - `float smoothIntersect(float d1, float d2, float k)`
- [ ] AC-2: `sceneSDF` uses at least 2 of the 3 CSG ops (minimum 1 smoothUnion + 1 smoothSubtract)
- [ ] AC-3: SDF tricks applied: at least 1 of — infinite repetition (`opRep`), mirror (`opMirror`), elongation (`opElongate`) — documented in JSDoc
- [ ] AC-4: Animated morphing — at least one primitive's param (radius, position, size) animated via `uTime`
- [ ] AC-5: File final state ≤600 lines (PRD R9 cap)
- [ ] AC-6: Visual output has psychedelic "cave/tunnel/fractal" character (manual check)
- [ ] AC-7: `check:shaders` PASS; FPS ≥25 (PRD §10.3 acknowledges fractal-cave is 30fps target but 25 acceptable for Isaac's Reels use — offline render OK)

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases
| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `fractal-cave: smoothUnion IQ formula` | Unit | Regex: `max\(k - abs\(d1 - d2\), 0\.0\)\|h = clamp\(0\.5 \+ 0\.5\*` (IQ pattern) | FAIL |
| 2 | `fractal-cave: smoothSubtract declared` | Unit | Regex: `float smoothSubtract\(` | FAIL |
| 3 | `fractal-cave: smoothIntersect declared` | Unit | Regex: `float smoothIntersect\(` | FAIL |
| 4 | `fractal-cave: sdf trick (opRep/opMirror/opElongate)` | Unit | Regex: `opRep\|opMirror\|opElongate\|mod\(p,` | FAIL |
| 5 | `fractal-cave: animated param via uTime` | Unit | Regex: `sd\w+\(.*uTime` within sceneSDF | FAIL |

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type |
|------|------------|
| `src/shaders/sketches/fractal-cave.frag` | Modify (replace T-C1 stub CSG + enhance sceneSDF) |
| `src/shaders/sketches/fractal-cave.test.ts` | Extend with T-C3 tests |

### 4.2 Implementation Steps (Green Phase)
1. Red tests
2. Replace `smoothUnion` stub in Section 1 with IQ formula:
   ```glsl
   float smoothUnion(float d1, float d2, float k) {
     float h = clamp(0.5 + 0.5*(d2-d1)/k, 0.0, 1.0);
     return mix(d2, d1, h) - k*h*(1.0-h);
   }
   float smoothSubtract(float d1, float d2, float k) {
     float h = clamp(0.5 - 0.5*(d2+d1)/k, 0.0, 1.0);
     return mix(d2, -d1, h) + k*h*(1.0-h);
   }
   float smoothIntersect(float d1, float d2, float k) {
     float h = clamp(0.5 - 0.5*(d2-d1)/k, 0.0, 1.0);
     return mix(d2, d1, h) + k*h*(1.0-h);
   }
   vec3 opRep(vec3 p, vec3 c) { return mod(p + 0.5*c, c) - 0.5*c; }
   ```
3. Enhance `sceneSDF`:
   ```glsl
   vec3 pr = opRep(p, vec3(4.0));                        // domain repetition trick
   float sph = sdSphere(pr, 0.6 + 0.3*sin(uTime*TAU));    // animated radius
   float box = sdBox(pr - vec3(sin(uTime*TAU), 0, 0), vec3(0.4));
   float tor = sdTorus(pr.xzy, vec2(1.0, 0.2));
   float a = smoothUnion(sph, box, 0.3);                  // CSG #1
   float b = smoothSubtract(tor, a, 0.1);                 // CSG #2
   return b;
   ```
4. Ensure main loop picks up — no main changes needed
5. check:shaders PASS
6. Visual inspection — "fractal cave" character present

### 4.3 Refactor Phase
- If file approaches 600-line cap, split primitives to `src/shaders/chunks/sdf3d.glsl` via vite-plugin-glsl import

## 5. Edge Cases
- EC-1: opRep wrap boundary — Can produce seams at 4.0 boundaries. k-smoothing mitigates
- EC-2: Animated radius creating negative values — clamp `0.6 + 0.3*sin()` stays positive
- EC-3: FPS drop below 20 → acceptable for offline render use, escalate if realtime needed

## 6. Review Checklist
- [ ] Red/Green PASS
- [ ] File ≤600 lines
- [ ] 3 CSG + 1 SDF trick + animation visible
- [ ] `check:shaders` PASS
- [ ] Visual: psychedelic fractal cave vibe
- [ ] Commit: `feat(sketch): T-C3 fractal-cave polish (CSG + sdf-tricks + morph)`
