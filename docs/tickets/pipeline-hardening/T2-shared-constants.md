# T2: Shared Constants — pipeline-constants.ts

**PRD Ref**: PRD-pipeline-hardening > US-1
**Priority**: P2 (Medium)
**Size**: S
**Status**: Todo
**Depends On**: T1

---

## 1. Objective
파이프라인 임계값을 의미별로 분류한 공유 상수 파일을 생성하고, 기존 파일의 로컬 상수를 공유 상수로 교체한다.

## 2. Acceptance Criteria
- [ ] AC-1: `scripts/lib/pipeline-constants.ts` 생성, 8개 상수 정의
- [ ] AC-2: `candidate-extraction.ts` 로컬 상수 제거 → 공유 import
- [ ] AC-3: `layer-resolve.ts` 로컬 상수 제거 → 공유 import
- [ ] AC-4: `pipeline-layers.ts` hardcoded 0.001/10 → SAM 상수 import
- [ ] AC-5: `research-config.ts` Zod default → 공유 상수 참조
- [ ] AC-6: 기존 동작 무변경 (SAM: alpha>10/0.001, BFS: alpha 128/0.005)

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases
| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `exports all 8 required constants` | Unit | 8개 상수 defined | all truthy |
| 2 | `SAM vs BFS thresholds are distinct` | Unit | SAM_OPACITY !== ALPHA | true |
| 3 | `SAM_MIN_COVERAGE < MIN_COVERAGE` | Unit | 값 관계 | 0.001 < 0.005 |
| 4 | `research-config defaults match constants` | Unit | Zod parse({}) 일치 | match |
| 5 | `existing tests pass` | Regression | 전체 테스트 | PASS |

### 3.2 Test File Location
- `scripts/lib/pipeline-constants.test.ts` (신규)

### 3.3 Mock/Setup Required
없음

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/lib/pipeline-constants.ts` | Create | 8개 상수 |
| `scripts/lib/pipeline-constants.test.ts` | Create | 테스트 |
| `scripts/lib/candidate-extraction.ts` | Modify | import 교체 |
| `scripts/lib/layer-resolve.ts` | Modify | import 교체 |
| `scripts/pipeline-layers.ts` | Modify | hardcoded → 상수 |
| `scripts/research/research-config.ts` | Modify | Zod default → 상수 |
| `scripts/research/research-config.test.ts` | Modify | hardcoded default assertions → 상수 import 또는 값 업데이트 |

### 4.2 Implementation Steps (Green Phase)
1. 테스트 작성 → FAIL (모듈 미존재)
2. `pipeline-constants.ts` 생성 — 8개 상수 export → PASS
3. `candidate-extraction.ts` — import 교체, 로컬 삭제
4. `layer-resolve.ts` — import 교체, 로컬 삭제
5. `pipeline-layers.ts` — `0.001` → `SAM_MIN_COVERAGE`, `> 10` → `> SAM_OPACITY_THRESHOLD`
6. `research-config.ts` — `.default(128)` → `.default(ALPHA_THRESHOLD)` 등
7. `research-config.test.ts` — default assertion 업데이트
8. 전체 테스트 → PASS

### 4.3 Refactor Phase
- `HOLE_WARNING_THRESHOLD` 등 단일 사용처 상수는 이동하지 않음

## 5. Edge Cases
없음

## 6. Review Checklist
- [ ] Red: 신규 테스트 FAILED
- [ ] Green: PASSED
- [ ] 중복 상수 정의 0 확인
