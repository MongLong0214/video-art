# T-C1: Fractal Cave Base (Ray-marching + SDF-3D + Normal Estimation)

**PRD Ref**: PRD-shader-dev-tier-abc > US-3 (AC-3.1, AC-3.2, AC-3.4, AC-3.6, AC-3.7)
**Priority**: P1 (Tier C bundle entrypoint)
**Size**: M (2-4h)
**Status**: Todo
**Depends On**: T0-a

---

## 1. Objective
Create `src/shaders/sketches/fractal-cave.frag` file skeleton following PRD AC-3.7 5-section structure. Implement Section 1-3: SDF primitives + scene composition + ray-marching + normal estimation. Lighting deferred to T-C2, polish to T-C3.

## 2. Acceptance Criteria
- [ ] AC-1: File `src/shaders/sketches/fractal-cave.frag` exists with full 5-section JSDoc header as per PRD AC-3.7
- [ ] AC-2: Section 1 — `sdSphere`, `sdBox`, `sdTorus` functions + `smoothUnion` stub (actual smooth in T-C3)
- [ ] AC-3: Section 2 — `float sceneSDF(vec3 p)` composing at least 2 primitives (e.g., sphere + box smooth union)
- [ ] AC-4: Section 3 — `float rayMarch(vec3 ro, vec3 rd)` with `MAX_STEPS=128`, `MIN_DIST=0.001`, `MAX_DIST=50.0`
- [ ] AC-5: Section 3 — `vec3 calcNormal(vec3 p)` using central-differences gradient (normal-estimation technique)
- [ ] AC-6: Section 4+5 — placeholder lighting (flat shading via `abs(normal)`) + `gl_FragColor = vec4(color, 1.0)`
- [ ] AC-7: File under 250 lines (Section 1-3 alone)
- [ ] AC-8: `?sketch=fractal-cave` loads without shader compile error (`npm run check:shaders` PASS)

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases
| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `fractal-cave.frag: 5-section JSDoc header` | Unit | Regex: `[SECTION 1].*[SECTION 2].*[SECTION 3].*[SECTION 4].*[SECTION 5]` multiline | FAIL |
| 2 | `fractal-cave.frag: sdSphere/sdBox/sdTorus declared` | Unit | Regex per function | FAIL |
| 3 | `fractal-cave.frag: rayMarch with MAX_STEPS` | Unit | Regex: `for.*i < (MAX_STEPS\|128)` | FAIL |
| 4 | `fractal-cave.frag: calcNormal central differences` | Unit | Regex: `vec3.*p \+ e\.xyy.*- .*p - e\.xyy` | FAIL |
| 5 | `fractal-cave.frag: sceneSDF composes primitives` | Unit | Regex: `sdSphere\|sdBox inside sceneSDF body` | FAIL |
| 6 | `sketch-registry: fractal-cave entry` | Unit | key exists | FAIL |

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type |
|------|------------|
| `src/shaders/sketches/fractal-cave.frag` | Create (Section 1-3 + stubs for 4-5) |
| `src/shaders/sketches/fractal-cave.test.ts` | Create (regex tests) |
| `src/lib/sketch-registry.ts` | Add entry |
| `src/main.ts` | Glob auto-picks up new .frag (no change) |

### 4.2 Implementation Steps (Green Phase)
1. Red tests
2. Write 5-section JSDoc header matching AC-3.7 exactly
3. Section 1: standard IQ distance functions (sphere/box/torus). `smoothUnion` as simple `min` for now
4. Section 2: `sceneSDF(vec3 p)`:
   ```glsl
   float d1 = sdSphere(p - vec3(sin(uTime)*0.5, 0, 0), 0.6);
   float d2 = sdBox(p, vec3(0.4));
   return min(d1, d2); // smoothUnion stub
   ```
5. Section 3: rayMarch + calcNormal (standard IQ pattern)
6. Section 4: `vec3 lighting(vec3 p, vec3 n)` stub returning `abs(n)` (per AC-6)
7. Section 5: main — build ray from vUv, rayMarch, calcNormal, lighting
8. Register in sketch-registry (fps 30 acceptable per PRD perf §10.3)
9. check:shaders pass

### 4.3 Refactor Phase
- N/A — polish in T-C3

## 5. Edge Cases
- EC-1 (PRD E7): t > MAX_DIST → return background color
- EC-2: Flat shading placeholder → obvious visual hint that lighting is stub
- EC-3: Loop at loopDuration — uTime-driven scene motion. Use TAU-modulated pattern

## 6. Review Checklist
- [ ] Red/Green PASS
- [ ] File ≤250 lines
- [ ] 5-section structure present
- [ ] `check:shaders` PASS for fractal-cave
- [ ] Commit: `feat(sketch): T-C1 fractal-cave base (SDF + raymarch + normal)`
