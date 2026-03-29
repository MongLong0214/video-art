# T1: RGB Independent Phase-Offset Color Cycling

**PRD Ref**: PRD-rgb-phase-offset > US-1
**Priority**: P1 (High)
**Size**: S (< 2h)
**Status**: Todo
**Depends On**: None

---

## 1. Objective
Add per-channel R/G/B phase offsets to the fragment shader so that each color channel oscillates independently, matching the reference video's anti-phase RGB dynamics (R→G: 72deg, R→B: 106deg).

## 2. Acceptance Criteria
- [ ] AC-1: Shader accepts `uRgPhaseOffset` and `uRbPhaseOffset` uniforms (degrees, 0-360)
- [ ] AC-2: Color cycling applies independent hue shifts per channel: R=hueShift, G=hueShift+rgOffset/360, B=hueShift+rbOffset/360
- [ ] AC-3: Default values: rgPhaseOffset=72, rbPhaseOffset=106
- [ ] AC-4: Luminance preservation still holds (hsv.z = originalVal per channel)
- [ ] AC-5: Scene schema validates `rgPhaseOffset` and `rbPhaseOffset` in AnimationConfig
- [ ] AC-6: Scene generator includes phase offsets in all role presets
- [ ] AC-7: `layered-psychedelic.ts` binds the new uniforms
- [ ] AC-8: Existing tests pass, new tests cover the new fields

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `scene schema accepts rgPhaseOffset and rbPhaseOffset` | Unit | Parse animation config with new fields | Valid parse |
| 2 | `scene schema defaults rgPhaseOffset=72 rbPhaseOffset=106` | Unit | Parse animation config without new fields | Defaults applied |
| 3 | `scene schema rejects rgPhaseOffset > 360` | Unit | Parse with out-of-range value | Zod error |
| 4 | `scene generator includes rgPhaseOffset in all role presets` | Unit | Generate scene, check all layers have rgPhaseOffset | Non-undefined |
| 5 | `scene generator uses reference-matched phase offsets` | Unit | Check bg-plate preset values | rgPhaseOffset=72, rbPhaseOffset=106 |

### 3.2 Test File Location
- `src/lib/scene-schema.test.ts` (existing, append)
- `scripts/lib/scene-generator.test.ts` (existing, append)

### 3.3 Mock/Setup Required
- Vitest: no mocking needed (pure functions)

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `src/shaders/layer.frag` | Modify | Add per-channel phase offset logic |
| `src/lib/scene-schema.ts` | Modify | Add rgPhaseOffset, rbPhaseOffset to animationSchema |
| `src/sketches/layered-psychedelic.ts` | Modify | Bind uRgPhaseOffset, uRbPhaseOffset uniforms |
| `scripts/lib/scene-generator.ts` | Modify | Add phase offsets to role presets |
| `src/lib/scene-schema.test.ts` | Modify | Add tests for new fields |
| `scripts/lib/scene-generator.test.ts` | Modify | Add tests for preset values |

### 4.2 Implementation Steps (Green Phase)
1. Add `rgPhaseOffset` and `rbPhaseOffset` to scene-schema animationSchema with defaults
2. Update scene-schema default in layerSchema
3. Add uniforms to shader, implement per-channel hue shift
4. Bind uniforms in layered-psychedelic.ts
5. Add phase offset values to all role presets in scene-generator.ts

### 4.3 Refactor Phase
- Remove `spatialSpread` (superseded by per-channel offset for entropy)

## 5. Edge Cases
- EC-1: rgPhaseOffset=0, rbPhaseOffset=0 → equivalent to current single-hue behavior
- EC-2: Fully transparent pixels → `discard` before color processing (already handled)

## 6. Review Checklist
- [ ] Red: 테스트 실행 → FAILED 확인됨
- [ ] Green: 테스트 실행 → PASSED 확인됨
- [ ] Refactor: 테스트 실행 → PASSED 유지 확인됨
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
