# T3: 새 uniform 전달 (layered-psychedelic.ts + scene-generator.ts 프리셋)

**PRD Ref**: PRD-layered-v2-psychedelic-overhaul > US-1, US-2, US-3, US-4, US-6
**Priority**: P0
**Size**: M (2-4h)
**Status**: Todo
**Depends On**: T1, T2

---

## 1. Objective

layered-psychedelic.ts에서 새 uniform 3개(uPhaseOffset, uSaturationBoost, uLuminanceKey)를 scene.json에서 읽어 셰이더에 전달하고, scene-generator.ts의 프리셋을 source.mp4 수준 파라미터로 교체한다.

## 2. Acceptance Criteria
- [ ] AC-1: `uPhaseOffset` uniform이 scene.json `colorCycle.phaseOffset` 값을 전달 (기본 0)
- [ ] AC-2: `uSaturationBoost` uniform이 scene.json `animation.saturationBoost` 값을 전달 (기본 2.5)
- [ ] AC-3: `uLuminanceKey` uniform이 scene.json `animation.luminanceKey` 값을 전달 (기본 0.6)
- [ ] AC-4: 새 프리셋에서 모든 period가 10의 약수 [1,2,5,10]
- [ ] AC-5: 새 프리셋의 phaseOffset: background=0°, subject=90°, detail=180°, foreground=270°
- [ ] AC-6: 새 프리셋의 colorCycle.speed=1.0 (period당 360° 1회전)
- [ ] AC-7: scene-generator가 duration=10으로 생성

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `should generate duration 10` | Unit | scene-generator 출력 | duration=10 |
| 2 | `should set phaseOffset per layer` | Unit | 4 레이어 phaseOffset | [0, 90, 180, 270] |
| 3 | `should set saturationBoost in presets` | Unit | 프리셋 saturationBoost | 2.0~3.0 범위 |
| 4 | `should set luminanceKey in presets` | Unit | 프리셋 luminanceKey | 0.4~0.8 범위 |
| 5 | `should have all periods as divisors of 10` | Unit | 모든 period | ∈ [1,2,5,10] |
| 6 | `should set colorCycle speed=1.0` | Unit | 프리셋 speed | 1.0 |
| 7 | `(기존 수정) should have duration 10` | Unit | 기존 `toBe(20)` → `toBe(10)` | 10 |
| 8 | `(기존 수정) should have periods as divisors of 10` | Unit | 기존 "divisors of 20" → `getValidPeriods(10)` import | [1,2,5,10] |

### 3.2 Test File Location
- `scripts/lib/scene-generator.test.ts` (기존 수정)

### 3.3 Mock/Setup Required
- 없음 (순수 함수 테스트)

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `src/sketches/layered-psychedelic.ts` | Modify | 새 uniform 3개 추가 |
| `scripts/lib/scene-generator.ts` | Modify | 프리셋 전면 교체 + duration 10 |
| `scripts/lib/scene-generator.test.ts` | Modify | 기존 테스트 업데이트 + 새 테스트 |

### 4.2 Implementation Steps (Green Phase)
1. `layered-psychedelic.ts`: ShaderMaterial uniforms에 3개 추가
   ```typescript
   uPhaseOffset:     { value: anim.colorCycle?.phaseOffset ?? 0 },
   uSaturationBoost: { value: anim.saturationBoost ?? 2.5 },
   uLuminanceKey:    { value: anim.luminanceKey ?? 0.6 },
   ```
2. `scene-generator.ts`: LAYER_PRESETS 교체
   ```
   background: speed=1.0, colorCycle.period=10, phaseOffset=0, satBoost=2.5, lumKey=0.6,
               wave={amplitude:2, frequency:0.3, period:10}, glow=생략(optional), parallax={depth:0}
   subject:    speed=1.0, colorCycle.period=5,  phaseOffset=90, satBoost=2.5, lumKey=0.5,
               wave=생략, glow=생략, parallax={depth:0.3}
   detail:     speed=1.0, colorCycle.period=2,  phaseOffset=180, satBoost=3.0, lumKey=0.7,
               wave=생략, glow=생략, parallax={depth:0.5}
   foreground: speed=1.0, colorCycle.period=5,  phaseOffset=270, satBoost=2.0, lumKey=0.4,
               wave=생략, glow=생략, parallax={depth:0.7}

   NOTE: wave/glow를 사용하지 않는 레이어는 해당 키를 생략 (optional).
   사용 시 period는 반드시 [1,2,5,10] 중 하나.
   ```
3. `scene-generator.ts`: duration 기본값 20 → 10
4. 테스트 업데이트

## 5. Edge Cases
- EC-1: uniform 미전달 시 셰이더에서 기본값 0.0 → saturationBoost=0이면 흑백. **반드시 기본값 전달**

## 6. Review Checklist
- [ ] Red/Green/Refactor 완료
- [ ] 브라우저 `/?mode=layered`에서 강렬한 색순환 확인
- [ ] 4 레이어가 서로 다른 위상으로 순환 확인
