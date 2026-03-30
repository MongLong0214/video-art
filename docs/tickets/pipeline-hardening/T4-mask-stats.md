# T4: computeMaskStats Utility (SAM Path)

**PRD Ref**: PRD-pipeline-hardening > US-3
**Priority**: P2 (Medium)
**Size**: S
**Status**: Todo
**Depends On**: T2

---

## 1. Objective
SAM mask의 bbox/centroid/coverage 계산을 유틸 함수로 추출하여 pipeline-layers.ts Step 4의 inline 로직을 단순화한다.

## 2. Acceptance Criteria
- [ ] AC-1: `scripts/lib/mask-stats.ts`에 `computeMaskStats` 함수 정의
- [ ] AC-2: 반환 타입 `{ coverage, bbox, centroid, opaqueCount }`
- [ ] AC-3: `pipeline-layers.ts` Step 4에서 호출로 교체
- [ ] AC-4: `candidate-extraction.ts` BFS fast path 미변경
- [ ] AC-5: fixture 테스트로 정확도 검증

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases
| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `correct coverage for fully opaque` | Unit | 4x4 all opaque | 1.0 |
| 2 | `correct coverage for half opaque` | Unit | 4x4 half | 0.5 |
| 3 | `correct bbox` | Unit | opaque at (1,1)-(2,2) | {x:1,y:1,w:2,h:2} |
| 4 | `correct centroid` | Unit | known positions | matches |
| 5 | `respects alphaThreshold` | Unit | threshold=128, alpha=100 | coverage=0 |
| 6 | `zero coverage for empty mask` | Unit | all alpha=0 | 0 |

### 3.2 Test File Location
- `scripts/lib/mask-stats.test.ts` (신규)

### 3.3 Mock/Setup Required
- 합성 RGBA `Uint8Array` 버퍼 helper

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/lib/mask-stats.ts` | Create | computeMaskStats |
| `scripts/lib/mask-stats.test.ts` | Create | 6개 테스트 |
| `scripts/pipeline-layers.ts` | Modify | Step 4 inline → computeMaskStats 호출 |

### 4.2 Implementation Steps (Green Phase)
1. 테스트 작성 (합성 RGBA 버퍼) → FAIL (모듈 미존재)
2. `mask-stats.ts` — `computeMaskStats` 구현 (pipeline-layers.ts line 145-177 로직 추출) → PASS
3. `pipeline-layers.ts` Step 4 — import + 호출 교체
4. 전체 테스트 → PASS

### 4.3 Refactor Phase
없음

## 5. Edge Cases
- EC-1: width * height = 0 → coverage=0, opaqueCount=0

## 6. Review Checklist
- [ ] Red: FAILED
- [ ] Green: PASSED
- [ ] `candidate-extraction.ts` 미변경 확인
