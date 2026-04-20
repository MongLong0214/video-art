# T-C2: Fractal Cave Lighting (Phong + Soft Shadow + Ambient Occlusion)

**PRD Ref**: PRD-shader-dev-tier-abc > US-3 (AC-3.3, AC-3.7 Section 4)
**Priority**: P1
**Size**: M (2-4h)
**Status**: Todo
**Depends On**: T-C1

---

## 1. Objective
Replace T-C1's placeholder lighting with full Phong model + soft shadow (shadow-techniques) + ambient occlusion (ambient-occlusion). Implements AC-3.3 (lighting-model + shadow + AO).

## 2. Acceptance Criteria
- [ ] AC-1: Section 4 contains `float softShadow(vec3 ro, vec3 rd, float mint, float maxt, float k)` — IQ soft shadow formula with iterative penumbra
- [ ] AC-2: Section 4 contains `float calcAO(vec3 p, vec3 n)` — 5-sample SDF gradient-based AO
- [ ] AC-3: `lighting(vec3 p, vec3 n, vec3 rd)` uses Phong: `ambient + diffuse*NdotL*shadow*ao + specular*pow(R·V, 32)`
- [ ] AC-4: At least 1 directional light (e.g., `normalize(vec3(0.5, 0.7, -0.3))`)
- [ ] AC-5: Sci-fi / psychedelic coloring (rim light contribution, hue shift via time)
- [ ] AC-6: File still ≤500 lines after this ticket
- [ ] AC-7: `check:shaders` PASS

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases
| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `fractal-cave: softShadow declared` | Unit | Regex: `float softShadow\(` | FAIL (stub only from T-C1) |
| 2 | `fractal-cave: calcAO declared` | Unit | Regex: `float calcAO\(` | FAIL |
| 3 | `fractal-cave: Phong diffuse NdotL` | Unit | Regex: `max\(dot\(n, l\)` | FAIL |
| 4 | `fractal-cave: Phong specular pow` | Unit | Regex: `pow\(.*R.*V.*, \d+` | FAIL |
| 5 | `fractal-cave: softShadow iterative penumbra` | Unit | Regex: `k \* h / t\|min\(res, ` (IQ pattern) | FAIL |

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type |
|------|------------|
| `src/shaders/sketches/fractal-cave.frag` | Modify (replace Section 4 stub with full impl) |
| `src/shaders/sketches/fractal-cave.test.ts` | Extend with T-C2 tests |

### 4.2 Implementation Steps (Green Phase)
1. Red tests added
2. Replace Section 4 body:
   ```glsl
   float softShadow(vec3 ro, vec3 rd, float mint, float maxt, float k) {
     float res = 1.0;
     float t = mint;
     for (int i = 0; i < 32; i++) {
       float h = sceneSDF(ro + rd * t);
       if (h < 0.001) return 0.0;
       res = min(res, k * h / t);
       t += h;
       if (t > maxt) break;
     }
     return res;
   }
   
   float calcAO(vec3 p, vec3 n) {
     float occ = 0.0;
     float sca = 1.0;
     for (int i = 0; i < 5; i++) {
       float h = 0.001 + 0.15 * float(i) / 4.0;
       float d = sceneSDF(p + n * h);
       occ += (h - d) * sca;
       sca *= 0.95;
     }
     return clamp(1.0 - 1.5 * occ, 0.0, 1.0);
   }
   
   vec3 lighting(vec3 p, vec3 n, vec3 rd) {
     vec3 lightDir = normalize(vec3(0.5, 0.7, -0.3));
     float NdotL = max(dot(n, lightDir), 0.0);
     float shadow = softShadow(p, lightDir, 0.02, 5.0, 16.0);
     float ao = calcAO(p, n);
     vec3 reflDir = reflect(lightDir, n);
     float spec = pow(max(dot(reflDir, -rd), 0.0), 32.0);
     vec3 ambient = vec3(0.1, 0.08, 0.15) * ao;
     vec3 diffuse = vec3(0.6, 0.4, 0.8) * NdotL * shadow * ao;
     vec3 specular = vec3(1.0, 0.9, 0.7) * spec * shadow;
     // Psychedelic rim (cheat: fresnel with hue-shifted)
     float rim = pow(1.0 - max(dot(n, -rd), 0.0), 2.0);
     vec3 rimColor = 0.5 + 0.5 * cos(6.28318 * (uTime * 0.05 + vec3(0, 0.33, 0.67)));
     return ambient + diffuse + specular + rim * rimColor * 0.5;
   }
   ```
3. Main unchanged (already calls `lighting()`)
4. Test → Green

### 4.3 Refactor Phase
- Verify lighting call site uses position/normal/rayDir correctly

## 5. Edge Cases
- EC-1: softShadow early exit when h < 0.001 → return 0 (fully shadowed)
- EC-2: AO with grazing angles → clamp 0..1
- EC-3: specular with backfaces → max(..., 0.0) guard

## 6. Review Checklist
- [ ] Red/Green PASS
- [ ] `check:shaders` PASS
- [ ] Visual: proper 3D shading + soft shadows + AO
- [ ] File ≤500 lines (approaching cap)
- [ ] Commit: `feat(sketch): T-C2 fractal-cave lighting (Phong+shadow+AO)`
