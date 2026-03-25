# T1: scene-schema 업데이트 (duration 10, 동적 VALID_PERIODS, 새 필드)

**PRD Ref**: PRD-layered-v2-psychedelic-overhaul > US-1, US-2, US-3, US-4, US-5, US-6
**Priority**: P0
**Size**: M (2-4h)
**Status**: Todo
**Depends On**: None

---

## 1. Objective

scene-schema.ts에 새 애니메이션 파라미터(saturationBoost, luminanceKey, phaseOffset)를 추가하고, duration 기본값을 10으로 변경하며, VALID_PERIODS를 duration 기반 동적 계산으로 전환한다.

## 2. Acceptance Criteria
- [ ] AC-1: duration 기본값 10, max 60
- [ ] AC-2: VALID_PERIODS가 duration의 약수로 동적 계산 (duration=10 → [1,2,5,10])
- [ ] AC-3: `animation.saturationBoost` 추가 (optional, 기본값 2.5, 범위 0~10)
- [ ] AC-4: `animation.luminanceKey` 추가 (optional, 기본값 0.6, 범위 0~1)
- [ ] AC-5: `colorCycle.phaseOffset` 추가 (optional, 기본값 0, 범위 0~360)
- [ ] AC-6: 기존 scene.json (새 필드 없음)이 파싱 에러 없이 동작 (기본값 적용)
- [ ] AC-7: period=4, period=20이 duration=10에서 Zod 검증 에러
- [ ] AC-8: period 에러 메시지가 동적 (`"Period must be a divisor of 10: 1, 2, 5, 10"`)

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `should have default duration of 10` | Unit | 기본 config의 duration | 10 |
| 2 | `should reject duration > 60` | Unit | duration=120 | Zod error |
| 3 | `should accept valid periods for duration=10: 1,2,5,10` | Unit | 각 period 값 | pass |
| 4 | `should reject period=4 for duration=10` | Unit | period=4 | Zod error |
| 5 | `should reject period=20 for duration=10` | Unit | period=20 | Zod error |
| 6 | `should accept period=4 for duration=20` | Unit | duration=20, period=4 | pass |
| 7 | `should have default saturationBoost of 2.5` | Unit | 기본 animation | 2.5 |
| 8 | `should have default luminanceKey of 0.6` | Unit | 기본 animation | 0.6 |
| 9 | `should have default phaseOffset of 0` | Unit | 기본 colorCycle | 0 |
| 10 | `should accept saturationBoost range 0-10` | Unit | 0, 5, 10 | pass |
| 11 | `should reject saturationBoost > 10` | Unit | 11 | Zod error |
| 12 | `should accept luminanceKey range 0-1` | Unit | 0, 0.5, 1 | pass |
| 13 | `should parse existing scene.json without new fields` | Unit | 기존 필드만 | 기본값 적용 |
| 14 | `should guarantee luminanceKey=0 means uniform shift` | Unit | luminanceKey=0 파싱 | 0 (T2에서 셰이더 분기로 균일 보장 위임) |
| 15 | `getValidPeriods(10) returns [1,2,5,10]` | Unit | 함수 직접 테스트 | [1,2,5,10] |
| 16 | `getValidPeriods(20) returns [1,2,4,5,10,20]` | Unit | 함수 직접 테스트 | [1,2,4,5,10,20] |
| 17 | `getValidPeriods(1) returns [1]` | Unit | 경계값 | [1] |
| 18 | `getValidPeriods(60) returns 12 divisors` | Unit | 경계값 | 길이 12 |

### 3.2 Test File Location
- `src/lib/scene-schema.test.ts` (기존 파일 수정)

### 3.3 Mock/Setup Required
- 없음 (순수 Zod 검증)

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `src/lib/scene-schema.ts` | Modify | VALID_PERIODS 동적화, 새 필드, duration 기본값/max |
| `src/lib/scene-schema.test.ts` | Modify | 기존 테스트 업데이트 + 새 테스트 추가 |

### 4.2 Implementation Steps (Green Phase)
1. `getValidPeriods(duration: number): number[]` 함수 export — duration의 약수 계산
2. `periodSchema`를 제거하고 `sceneSchema.superRefine()`에서 duration 기반 cross-field 검증
3. `animationSchema`에 `saturationBoost`, `luminanceKey` 추가 (optional + default)
4. `colorCycleSchema`에 `phaseOffset` 추가 (optional + default)
5. `duration` 기본값 10, `.max(60)` 추가
6. period 에러 메시지 동적화
7. 기존 테스트 업데이트 (duration 20→10, VALID_PERIODS 변경)
8. 새 필드 테스트 추가

### 4.3 Refactor Phase
- `getValidPeriods` 함수를 validate-loop.ts에서도 import 가능하도록 export

## 5. Edge Cases
- EC-1: duration=1 → VALID_PERIODS=[1]만 유효
- EC-2: duration=60 → 약수 [1,2,3,4,5,6,10,12,15,20,30,60]
- EC-3: 기존 scene.json에 새 필드 없음 → 기본값 적용

## 6. Review Checklist
- [ ] Red: 테스트 실행 → FAILED 확인됨
- [ ] Green: 테스트 실행 → PASSED 확인됨
- [ ] Refactor: 테스트 실행 → PASSED 유지 확인됨
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
