# T9: Selective Recursive Qwen

**PRD Ref**: PRD-layer-decomposition-overhaul > US-3, §5.7, §4.1 (API cap)
**Priority**: P2 (Medium)
**Size**: M
**Status**: Todo
**Depends On**: T7

---

## 1. Objective

복잡한 candidate를 선택적으로 Qwen에 재분해 요청. API call cap 내에서 운영.

## 2. Acceptance Criteria

- [ ] AC-1: recursive trigger 조건: coverage > 30% && (componentCount > 3 || edgeDensity > 0.15)
- [ ] AC-2: Variant A: base 1 + recursive 최대 3 = 총 4회 cap
- [ ] AC-3: recursive pass가 manifest에 기록 (AC-3.4)
- [ ] AC-4: recursive 결과가 extraction → dedupe → ownership 파이프라인에 재투입
- [ ] AC-5: recursive 실패 시 parent candidate 유지 (E5)

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `should trigger recursive on large complex candidate` | Unit | coverage=0.5, components=5 | recursive triggered |
| 2 | `should not trigger on small simple candidate` | Unit | coverage=0.1, components=1 | no recursive |
| 3 | `should respect API call cap` | Unit | 이미 3회 recursive | cap reached, no more |
| 4 | `should record recursive pass in manifest` | Unit | recursive 실행 | passes[].type="qwen-recursive" |
| 5 | `should keep parent on recursive failure` | Unit | recursive API 실패 | parent retained |
| 6 | `should reintegrate recursive results` | Integration | recursive 성공 | 자식 candidates가 dedupe 통과 |

### 3.2 Test File Location
- `scripts/lib/pipeline-integration.test.ts` (T7과 동일 파일에 추가)

### 3.3 Mock/Setup Required
- Replicate API mock

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/lib/image-decompose.ts` | Modify | recursiveDecompose() 추가 |
| `scripts/pipeline-layers.ts` | Modify | recursive step 삽입 |

### 4.2 Implementation Steps (Green Phase)
1. `shouldRecurse(candidate)`: trigger 조건 판별
2. `recursiveDecompose(candidate, apiCallCount)`: cap 체크 → Qwen 호출 → extraction
3. pipeline에 recursive step 삽입 (extraction 후, dedupe 전)
4. manifest에 recursive pass 기록

### 4.3 Refactor Phase
- trigger threshold를 config로 분리

## 5. Edge Cases
- EC-1: recursive가 parent보다 나쁜 결과 → parent 유지 (raw coverage + componentCount 비교, uniqueCoverage는 이 시점에 미계산)
- EC-2: cap 도달 후 남은 complex candidate → 그대로 retain

## 6. Review Checklist
- [ ] Red: 테스트 실행 → FAILED 확인됨
- [ ] Green: 테스트 실행 → PASSED 확인됨
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
