# T2: TS detectSections() 정규화 동기화

**PRD Ref**: PRD-audio-pipeline-fix > US-1
**Priority**: P1 (High)
**Size**: S (< 2h)
**Status**: Todo
**Depends On**: None

---

## 1. Objective
`track-analyzer.ts`의 `detectSections()`를 T1과 동일한 에너지 기반 정규화로 동기화한다.

## 2. Acceptance Criteria
- [ ] AC-1.4: detectSections()가 T1과 동일 로직 적용 (에너지 기반, 최소 길이, outro 상한)
- [ ] AC: 기존 generatePreset() 호출 체인에서 sections가 정규화된 값으로 생성

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `detectSections returns >= 4 sections for normal curve` | Unit | 100-point 에너지 커브 | sections.length >= 4 |
| 2 | `each section >= 5% of curve length` | Unit | 각 섹션 start-end 범위 | >= 0.05 (normalized) |
| 3 | `outro <= 50% of total` | Unit | outro 비율 | <= 0.5 |
| 4 | `all-zero curve → single drop` | Unit | 모두 0 | [{ label: "drop" }] |
| 5 | `sections cover 0 to 1 without gaps` | Unit | start[0]=0, end[-1]=1 | True |

### 3.2 Test File Location
- `scripts/lib/track-analyzer.test.ts` (기존 파일에 추가)

### 3.3 Mock/Setup Required
- 합성 에너지 커브 배열 (vitest)

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/lib/track-analyzer.ts` | Modify | `detectSections()` 에너지 기반 재작성 |
| `scripts/lib/track-analyzer.test.ts` | Modify | 테스트 추가 |

### 4.2 Implementation Steps (Green Phase)
1. `detectSections(curve)` 내부 threshold 로직을 T1과 동일 알고리즘으로 교체
2. 정규화된 0-1 범위로 섹션 경계 반환 (기존 인터페이스 유지)
3. 최소 길이 / outro 상한 검증 추가

### 4.3 Refactor Phase
- T1과 공유 가능한 상수 정의 고려 (MIN_SECTION_RATIO 등)

## 5. Edge Cases
- EC-1: 빈 배열 → 단일 "drop"
- EC-2: 길이 1 배열 → 단일 "drop"
