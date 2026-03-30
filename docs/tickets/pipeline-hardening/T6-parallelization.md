# T6: Mask Processing Parallelization

**PRD Ref**: PRD-pipeline-hardening > US-6
**Priority**: P3 (Low)
**Size**: M
**Status**: Todo
**Depends On**: T5

---

## 1. Objective
pipeline-layers.ts Step 4의 순차 마스크 로딩을 batched Promise.all로 전환하여 속도를 개선한다.

## 2. Acceptance Criteria
- [ ] AC-1: Step 4 순차 for → batched Promise.all (concurrency=4)
- [ ] AC-2: 결과 순서 보존
- [ ] AC-3: 에러 시 전체 실패
- [ ] AC-4: 4K peak ~400-500MB 이내

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases
| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `limits concurrency to 4` | Unit | 8 items → peak concurrent ≤ 4 | maxConcurrent ≤ 4 |
| 2 | `preserves result order` | Unit | items 0-7 → ordered output | ordered |
| 3 | `fails entirely on single error` | Unit | item 3 fails → all fail | throws |
| 4 | `handles fewer than batch size` | Unit | 2 items, batch=4 | works |

### 3.2 Test File Location
- `scripts/lib/batch-process.test.ts` (신규 — 추출된 batch helper 테스트)

### 3.3 Mock/Setup Required
- 합성 async fn + `maxConcurrent` counter로 피크 동시 실행 수 측정 (Promise.all 호출 횟수 검증 금지 — 구현 의존적)

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/lib/batch-process.ts` | Create | `batchProcess<T,R>(items, batchSize, fn): Promise<R[]>` — 테스트 가능한 유틸 |
| `scripts/lib/batch-process.test.ts` | Create | 4개 테스트 |
| `scripts/pipeline-layers.ts` | Modify | Step 4 for loop → `batchProcess` 호출 |

### 4.2 Implementation Steps (Green Phase)
1. 테스트 작성 → FAIL (모듈 미존재)
2. `batch-process.ts` — `batchProcess` 구현 → PASS
3. `pipeline-layers.ts` Step 4 — import + 호출 교체
4. 전체 테스트 → PASS

### 4.3 Refactor Phase
없음

## 5. Edge Cases
- EC-1: 0 items → 빈 배열 반환
- EC-2: 1 item → batch 1개

## 6. Review Checklist
- [ ] Red: FAILED
- [ ] Green: PASSED
- [ ] 순서 보존 확인
- [ ] 에러 전파 확인
