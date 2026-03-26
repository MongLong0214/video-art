# T5: Role Assignment + Background Plate

**PRD Ref**: PRD-layer-decomposition-overhaul > US-2, US-5, §5.10, §5.11
**Priority**: P1 (High)
**Size**: M
**Status**: Todo
**Depends On**: T4

---

## 1. Objective

retained layer에 역할 부여 + **role-aware final drop/cap** (T4에서 위임) + background plate 감지 및 hole fill.

## 2. Acceptance Criteria

- [ ] AC-1: 모든 retained layer에 LayerRole이 부여됨 (AC-5.1)
- [ ] AC-2: background-plate는 항상 가장 뒤 zIndex (AC-2.2)
- [ ] AC-3: foreground-occluder는 가장 앞쪽 그룹 (AC-2.3)
- [ ] AC-4: ordering이 coverage sort만으로 결정되지 않음 (AC-2.1)
- [ ] AC-5: background plate hole > 50% → 원본 unclaimed pixels fallback + manifest 경고
- [ ] AC-6: uniqueCoverage < 2% layer는 drop (role-critical 예외: subject, background-plate는 유지) (AC-1.4)
- [ ] AC-7: retained layer count ≤ 8, role priority ladder로 drop (AC-1.5)
- [ ] AC-8: all-candidate-drop fallback: 원본을 단일 background plate로 사용 (PRD E4)

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `should assign background-plate to widest back layer` | Unit | 가장 큰 coverage + low centroid.y | role=background-plate |
| 2 | `should assign subject to central bbox` | Unit | 중앙 bbox 영역 | role=subject |
| 3 | `should assign foreground-occluder to edge-touching front` | Unit | 화면 가장자리 닿는 영역 | role=foreground-occluder |
| 4 | `should place bg-plate at lowest zIndex` | Unit | 여러 layer | bg-plate.zIndex=0 |
| 5 | `should place fg-occluder at highest zIndex` | Unit | 여러 layer | fg-occluder.zIndex=max |
| 6 | `should fill bg plate holes with unclaimed pixels` | Unit | bg plate 60% hole | fallback 적용, overlap 없음 |
| 7 | `should warn when hole > 50%` | Unit | bg plate 55% hole | manifest에 warning |
| 8 | `should not order by coverage alone` | Unit | small subject + large bg | subject.zIndex > bg.zIndex |
| 9 | `should drop uniqueCoverage < 2% non-critical` | Unit | detail with 1% uniqueCoverage | dropped |
| 10 | `should keep role-critical despite low uniqueCoverage` | Unit | subject with 1% uniqueCoverage | retained |
| 11 | `should cap at 8 layers by role priority` | Unit | 12 candidates with roles | 8 retained |
| 12 | `should fallback to original as bg plate when all drop` | Unit | all candidates uniqueCoverage < 2% | 1 bg-plate from original |

### 3.2 Test File Location
- `scripts/lib/layer-resolve.test.ts` (T4와 동일 파일에 describe 블록 추가)

### 3.3 Mock/Setup Required
- 합성 candidate masks with known bbox/centroid

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/lib/layer-resolve.ts` | Modify | assignRoles() + fillBackgroundPlate() 추가 |

### 4.2 Implementation Steps (Green Phase)
1. `assignRoles(candidates)`: bbox/centroid/coverage 기반 heuristic
2. `orderByRole(candidates)`: role priority + geometry 기반 zIndex
3. `fillBackgroundPlate(bgPlate, originalImage, claimedMask)`: unclaimed pixels 추출

### 4.3 Refactor Phase
- role heuristic threshold를 config로 분리

## 5. Edge Cases
- EC-1: subject가 없는 추상 이미지 → midground로 fallback
- EC-2: 모든 layer가 가장자리 접촉 → 가장 작은 것을 detail로
- EC-3: background plate가 candidate에 없음 → 원본 전체를 background plate

## 6. Review Checklist
- [ ] Red: 테스트 실행 → FAILED 확인됨
- [ ] Green: 테스트 실행 → PASSED 확인됨
- [ ] Refactor: 테스트 실행 → PASSED 유지 확인됨
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
