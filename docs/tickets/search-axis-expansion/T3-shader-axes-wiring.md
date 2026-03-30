# T3: Shader Axes — Uniform Wiring (Phase B)

**PRD Ref**: PRD-search-axis-expansion > US-2
**Priority**: P1 (High)
**Size**: M (2-4h)
**Status**: Todo
**Depends On**: T2

---

## 1. Objective

T2에서 scene.json에 기록된 5개 셰이더 파라미터를 layer.frag uniform으로 선언하고, layered-psychedelic.ts에서 바인딩하여 실제 셰이더에 반영.

## 2. Acceptance Criteria

- [ ] AC-1: layer.frag에 5개 uniform 선언: `uSatBlendLow`, `uSatBlendHigh`, `uSatInjectionMul`, `uGlowPulseFloor`, `uLumExponent`
- [ ] AC-2: layer.frag line 64 변경: `smoothstep(0.1, 0.4, ...)` → `smoothstep(uSatBlendLow, uSatBlendHigh, ...)`
- [ ] AC-3: layer.frag line 67 변경: `uSaturationBoost * 0.35` → `uSaturationBoost * uSatInjectionMul`
- [ ] AC-4: layer.frag line 79 변경: `0.5 + 0.5 * sin(glowT)` → `uGlowPulseFloor + (1.0 - uGlowPulseFloor) * 0.5 * (1.0 + sin(glowT))`
- [ ] AC-5: layer.frag line 55 변경: `pow(1.0 - lum, 1.0 + uLuminanceKey)` → `pow(1.0 - lum, uLumExponent + uLuminanceKey)`. guard `uLuminanceKey > 0.001` 유지
- [ ] AC-6: layered-psychedelic.ts uniforms에 5개 바인딩 추가 (scene.json animation에서 읽기)
- [ ] AC-7: default 값(0.1, 0.4, 0.35, 0.0, 1.0)에서 기존 셰이더 출력과 동일

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `shader declares uSatBlendLow uniform` | Unit | layer.frag 소스에 `uniform float uSatBlendLow` 포함 | grep match |
| 2 | `shader declares uGlowPulseFloor uniform` | Unit | layer.frag 소스에 `uniform float uGlowPulseFloor` 포함 | grep match |
| 3 | `shader declares uLumExponent uniform` | Unit | layer.frag 소스에 `uniform float uLumExponent` 포함 | grep match |
| 4 | `renderer binds shader uniforms from scene.json` | Unit | layered-psychedelic.ts uniforms 객체에 uSatBlendLow 키 존재 | key exists |
| 5 | `default glowPulseFloor=0.0 produces 0.5+0.5*sin` | Unit | formula verification: `0.0 + 1.0*0.5*(1+sin(0))` = 0.5+0.5*0 = 0.5 | 0.5 (at sin=0) |
| 6 | `satInjectionMul formula: uSaturationBoost * uSatInjectionMul` | Unit | satInjectionMul=0.5 → injectedSat = boost * 0.5 (not boost * 0.35) | changed |
| 7 | `lumExponent guard: luminanceKey=0 → lumPhase=0` | Unit | lumExponent=2.0 + luminanceKey=0.0 → lumPhase=0 (guard fires) | 0 |
| 8 | `uniform binding receives non-default value` | Unit | scene.json satBlendLow=0.2 → uniforms.uSatBlendLow.value === 0.2 | 0.2 |

### 3.2 Test File Location

- `scripts/lib/scene-generator.test.ts` (uniform 바인딩 구조 검증)
- 셰이더 소스 grep은 integration test 또는 단순 file-read assertion

### 3.3 Mock/Setup Required

- Vitest: `fs.readFileSync` for shader source verification
- uniform 바인딩: layered-psychedelic.ts 모듈 import 검증 (구조 확인)

## 4. Implementation Guide

### 4.1 Files to Modify

| File | Change Type | Description |
|------|------------|-------------|
| `src/shaders/layer.frag` | Modify | 5개 uniform 선언 + 하드코딩 상수 교체 |
| `src/sketches/layered-psychedelic.ts` | Modify | ShaderMaterial uniforms에 5개 바인딩 추가 |

### 4.2 Implementation Steps (Green Phase)

1. layer.frag: uniform 선언부에 5개 추가
2. layer.frag: `smoothstep(0.1, 0.4,` 패턴 검색 → `smoothstep(uSatBlendLow, uSatBlendHigh,`로 교체
3. layer.frag: `uSaturationBoost * 0.35` 패턴 검색 → `uSaturationBoost * uSatInjectionMul`로 교체
4. layer.frag: `0.5 + 0.5 * sin(glowT)` 패턴 검색 → `uGlowPulseFloor + (1.0 - uGlowPulseFloor) * 0.5 * (1.0 + sin(glowT))`로 교체
5. layer.frag: `pow(1.0 - lum, 1.0 + uLuminanceKey)` 패턴 검색 → `pow(1.0 - lum, uLumExponent + uLuminanceKey)`로 교체 (guard `uLuminanceKey > 0.001` 유지)
6. layered-psychedelic.ts: uniforms 객체에 `uSatBlendLow: { value: anim.satBlendLow ?? 0.1 }` 등 5개 추가

### 4.3 Refactor Phase

- 없음

## 5. Edge Cases

- EC-1: lumExponent=3.0 + luminanceKey=1.056 → exponent=4.056 → 어두운 영역 강한 비선형 (E7)
- EC-2: glowPulseFloor=0.9 → oscillation [0.9, 1.0] 범위 → 거의 변화 없음 (E4)

## 6. Review Checklist

- [ ] Red → FAILED
- [ ] Green → PASSED
- [ ] Refactor → PASSED 유지
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
- [ ] Phase B 완료 후 `npm run research:run` 1회 성공 확인
