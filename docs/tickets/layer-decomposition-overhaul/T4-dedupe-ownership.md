# T4: Dedupe + Exclusive Ownership

**PRD Ref**: PRD-layer-decomposition-overhaul > US-1, §5.8, §5.9
**Priority**: P0 (Blocker)
**Size**: M
**Status**: Todo
**Depends On**: T3

---

## 1. Objective

candidate 간 중복 제거 (IoU dedupe) + binarized exclusive ownership으로 각 픽셀을 단일 레이어에 귀속 + uniqueCoverage 계산. **최종 drop/cap 결정은 T5에서 role 부여 후 수행** (role-critical 예외가 role 정보를 필요로 하므로).

## 2. Acceptance Criteria

- [ ] AC-1: IoU > 0.85 + bbox/centroid 유사 → merge 또는 drop (AC-1.3)
- [ ] AC-2: Exclusive ownership 후 각 픽셀이 최대 1개 retained layer에 귀속
- [ ] AC-3: retained layer 간 pairwise pixel overlap ≤ 5% (AC-2.4)
- [ ] AC-4: 각 candidate에 uniqueCoverage가 계산됨 (drop 결정은 T5로 위임)

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `should merge candidates with IoU > 0.85` | Unit | 90% 겹치는 두 mask | 1 retained |
| 2 | `should keep candidates with IoU < 0.85` | Unit | 30% 겹치는 두 mask | 2 retained |
| 3 | `should enforce exclusive ownership` | Unit | 50% 겹치는 A, B | exclusive_A + exclusive_B 교집합 = 0 |
| 4 | `should compute uniqueCoverage for each candidate` | Unit | ownership 결과 | uniqueCoverage > 0 for non-empty |
| 7 | `should compute pairwise overlap <= 5%` | Unit | exclusive ownership 결과 | all pairs ≤ 5% |
| 8 | `should record drop reasons` | Unit | dropped candidate | droppedReason populated |

### 3.2 Test File Location
- `scripts/lib/layer-resolve.test.ts` (신규)

### 3.3 Mock/Setup Required
- 합성 binary mask buffers (sharp 생성)

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/lib/layer-resolve.ts` | Create | dedupe + exclusive ownership + cap enforcement |

### 4.2 Implementation Steps (Green Phase)
1. `deduplicateCandidates(candidates)`: pairwise IoU 계산, > 0.85 merge/drop
2. `resolveExclusiveOwnership(candidates)`: binarized mask 순회, claimed_mask 누적, uniqueCoverage 계산
3. `computePairwiseOverlap(candidates)`: AC-2.4 검증용
4. 최종 drop (uniqueCoverage < 2%) 및 cap(8)은 T5에서 role 부여 후 수행

### 4.3 Refactor Phase
- IoU 계산을 SIMD-friendly typed array로 최적화

## 5. Edge Cases
- EC-1: 모든 candidate가 동일 → 1개만 retain
- EC-2: 모든 candidate가 완전 독립 → dedupe 없음, cap만 적용
- EC-3: role-critical이 8개 초과 → 가장 낮은 priority role drop

## 6. Review Checklist
- [ ] Red: 테스트 실행 → FAILED 확인됨
- [ ] Green: 테스트 실행 → PASSED 확인됨
- [ ] Refactor: 테스트 실행 → PASSED 유지 확인됨
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
