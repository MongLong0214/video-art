# T4: Overlap Resolution + Background Plate

**PRD Ref**: PRD-sam3-semantic-decomposition > US-3 (AC-3.1~3.4), US-4 (AC-4.1~4.5)
**Priority**: P1 (High)
**Size**: M (2-3h)
**Status**: Todo
**Depends On**: T1, T3

---

## 1. Objective

SAM3 마스크 간 겹침을 depth 순 정렬로 해소 + 미커버 잔여 영역 background plate 합성. 기존 resolveExclusiveOwnership() 재사용.

## 2. Acceptance Criteria

- [ ] AC-1: SAM3 candidates를 `meanDepth` 내림차순 정렬 (near-first) 후 `resolveExclusiveOwnership()` 호출
- [ ] AC-2: depth 없을 때: coverage 오름차순 정렬 후 호출
- [ ] AC-3: uniqueCoverage 재계산 확인
- [ ] AC-4: union coverage 계산 → 미커버 영역 background plate 생성
- [ ] AC-5: 미커버 5%+ → bg plate 레이어 (role=background-plate, z-index 0)
- [ ] AC-6: 미커버 <5% → bg plate를 원본 전체로 생성 (z-index 0)
- [ ] AC-7: bg plate meanDepth = 미커버 영역 depth 평균

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `sortByDepth: near-first ordering` | Unit | candidates [depth=50, depth=200, depth=100] | [200, 100, 50] |
| 2 | `sortByDepth: no depth → coverage ascending` | Unit | candidates [cov=0.3, cov=0.1, cov=0.5] | [0.1, 0.3, 0.5] |
| 3 | `overlap resolution: near layer claims first` | Integration | 2 overlapping candidates, depth 200 vs 50 | depth=200 gets overlap pixels |
| 4 | `background plate: uncovered > 5% → plate created` | Unit | union=80% | bg plate with 20% unique |
| 5 | `background plate: uncovered < 5% → plate still created` | Unit | union=97% | bg plate with 3% unique |
| 6 | `background plate meanDepth from uncovered pixels` | Unit | depth map + uncovered mask | correct mean |

### 3.2 Test File Location

- `scripts/lib/image-decompose.test.ts` (append)

### 3.3 Mock/Setup Required

- Vitest: synthetic candidates with overlapping masks + depth values

## 4. Implementation Guide

### 4.1 Files to Modify

| File | Change Type | Description |
|------|------------|-------------|
| `scripts/lib/image-decompose.ts` | Modify | sortCandidatesForOverlap() + buildBackgroundPlate() |
| `scripts/lib/image-decompose.test.ts` | Modify | overlap + bg plate tests |

### 4.2 Implementation Steps (Green Phase)

1. `sortCandidatesForOverlap(candidates, hasDepth)`: depth 내림차순 or coverage 오름차순
2. 정렬 후 기존 `resolveExclusiveOwnership()` 호출 (layer-resolve.ts에서 import)
3. union coverage 계산: `compositeAlpha` Uint8Array 순회
4. background plate: 미커버 픽셀 → 원본 이미지에서 추출 → RGBA PNG 저장
5. bg plate meanDepth: depthGray에서 미커버 픽셀만 평균

## 5. Edge Cases

- EC-1 (E5): 100% coverage 마스크 → 나머지 마스크 uniqueCoverage=0 → 단일 레이어 + bg plate
- EC-2: 모든 마스크 depth 동일 → 순서 무의미 → coverage 기반 fallback

## 6. Review Checklist

- [ ] Red → Green → Refactor
- [ ] resolveExclusiveOwnership 시그니처 변경 없음
- [ ] bg plate가 항상 생성됨 (union 100%일 때도)
