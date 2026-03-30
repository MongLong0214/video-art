# T4: Scene Generator Axes (Phase C)

**PRD Ref**: PRD-search-axis-expansion > US-3
**Priority**: P1 (High)
**Size**: M (2-4h)
**Status**: Todo
**Depends On**: T1

---

## 1. Objective

tempoMul, phaseSpreadMul, periodRangeLow/High, glowPeriodMul 5개 씬 제너레이터 파라미터를 research-config.ts에서 제어 가능하게 배선.

## 2. Acceptance Criteria

- [ ] AC-1: `tempoMul` (0.3~3.0, default 1.0) → `tempo = 0.85 * tempoMul`
- [ ] AC-2: `phaseSpreadMul` (0.1~3.0, default 1.0) → `phaseOffset = round(360*i/total * phaseSpreadMul)`
- [ ] AC-3: `periodRangeLow` (1.0~10.0, default 1.0) + `periodRangeHigh` (5.0~30.0, default 20.0) → `getValidPeriods(duration).filter(p => p >= low && p <= high)`
- [ ] AC-4: Zod refinement `periodRangeLow < periodRangeHigh`
- [ ] AC-5: 빈 period 배열 시 전체 약수 폴백 (E9)
- [ ] AC-6: `glowPeriodMul` (0.3~3.0, default 1.0) → `rawPeriod * mul` → 가장 가까운 유효 약수로 스냅 (E12)
- [ ] AC-7: default 값에서 기존 애니메이션과 동일

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `tempoMul scales tempo` | Unit | tempoMul=2.0 → internal tempo = 0.85*2 = 1.7 | speed reflects 1.7 tempo |
| 2 | `phaseSpreadMul scales phaseOffset` | Unit | 3 layers, phaseSpreadMul=2.0 → offsets [0, 240, 480%360=120] | [0, 240, 120] |
| 3 | `periodRangeLow/High filters periods` | Unit | duration=20, low=4, high=10 → [4,5,10] only | 3 periods |
| 4 | `empty period list falls back` | Unit | duration=20, low=11, high=19 → no divisors → fallback to all | [1,2,4,5,10,20] |
| 5 | `periodRangeLow >= periodRangeHigh rejected` | Unit | low=10, high=5 | Zod error |
| 6 | `glowPeriodMul snaps to nearest divisor` | Unit | duration=20, base period=5, mul=1.5 → raw=7.5 → snap to 5 or 10 | nearest valid |
| 7 | `default config produces identical scene.json` | Integration | default config → scene.json matches current output | exact |
| 8 | `tempoMul default=1.0 produces tempo=0.85` | Unit | verify speed calculation matches existing | exact |
| 9 | `legacy config without scenegen fields parses with defaults` | Unit | ResearchConfigSchema.parse({}) → tempoMul=1.0, periodRangeLow=1.0, periodRangeHigh=20.0 | schema defaults |
| 10 | `glowPeriodMul tie-break: equidistant snaps to larger divisor` | Unit | duration=20, base=5, mul=1.5 → raw=7.5 → snap to 10 (round up) | 10 |

### 3.2 Test File Location

- `scripts/lib/scene-generator.test.ts`
- `scripts/research/research-config.test.ts`

### 3.3 Mock/Setup Required

- Vitest: pure function 테스트. mock 불필요.

## 4. Implementation Guide

### 4.1 Files to Modify

| File | Change Type | Description |
|------|------------|-------------|
| `scripts/research/research-config.ts` | Modify | 5개 스키마 + refinement + defaults |
| `scripts/lib/scene-generator.ts` | Modify | tempo/phase/period/glow 로직 수정 |

### 4.2 Implementation Steps (Green Phase)

1. research-config.ts: Zod 스키마에 5개 파라미터 추가. **getDefaultConfig()에는 추가하지 않음** — Zod schema default 적용. `.refine(c => c.periodRangeLow < c.periodRangeHigh)` 추가 (T2의 satBlend refinement 뒤에 체이닝)
2. scene-generator.ts: `const tempo = 0.85 * (mul.tempoMul ?? 1.0)`
3. scene-generator.ts: `const phaseOffset = Math.round((360 * index) / total * (mul.phaseSpreadMul ?? 1.0))`
4. scene-generator.ts: `filterPeriods(duration, low, high)` pure 함수 추출. `getValidPeriods(duration).filter(p => p >= low && p <= high)`. 빈 배열이면 전체 약수 폴백
5. scene-generator.ts: `quantizeToNearestDivisor(raw, validPeriods)` pure 함수 추출. tie-break: equidistant 시 larger divisor 선택 (round up). glowPeriod에 적용
6. scene-generator.ts: SceneMultipliers에 5개 추가 + extraction

### 4.3 Refactor Phase

- `quantizeToNearestDivisor`를 scene-schema.ts로 이동 고려 (getValidPeriods와 같은 위치)

## 5. Edge Cases

- EC-1: periodRangeLow=11, periodRangeHigh=19, duration=20 → 빈 배열 → 폴백 (E9)
- EC-2: glowPeriodMul=3.0, base=5 → raw=15 → snap to 10 or 20 (E12)
- EC-3: tempoMul=0.3 → tempo=0.255 → 극저속 (E6)

## 6. Review Checklist

- [ ] Red → FAILED
- [ ] Green → PASSED
- [ ] Refactor → PASSED 유지
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
