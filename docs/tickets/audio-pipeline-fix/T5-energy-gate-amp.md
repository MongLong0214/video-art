# T5: 에너지 게이트 및 앰프 정상화

**PRD Ref**: PRD-audio-pipeline-fix > US-3
**Priority**: P1 (High)
**Size**: S (< 2h)
**Status**: Todo
**Depends On**: T4 (이벤트 생성 코드가 먼저 존재해야 게이트 효과 검증 가능)

---

## 1. Objective
supersaw 에너지 게이트를 낮추고 SECTION_AMP 최소값을 올려 모든 스템이 청취 가능한 레벨을 유지한다.

## 2. Acceptance Criteria
- [ ] AC-3.1: supersaw 에너지 게이트 0.4 → 0.15 (상수 `SUPERSAW_ENERGY_GATE` 추출)
- [ ] AC-3.2: dry-run에서 모든 스템 그룹에 이벤트 존재 (RMS > -40dB는 실제 렌더 후 검증)
- [ ] AC-3.3: SECTION_AMP intro/outro 0.5 → 0.65

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `SUPERSAW_ENERGY_GATE is 0.15` | Unit | 상수 값 | 0.15 |
| 2 | `SECTION_AMP intro is 0.65` | Unit | 상수 값 | 0.65 |
| 3 | `SECTION_AMP outro is 0.65` | Unit | 상수 값 | 0.65 |
| 4 | `supersaw events pass with energy 0.2` | Integration | energy=0.2 dry-run | supersaw 이벤트 > 0 |
| 5 | `intro section events have amp >= 0.65 * base` | Integration | intro 이벤트 amp 검증 | >= 0.65 * base |

### 3.2 Test File Location
- `scripts/lib/render-analysis.test.ts` (T3에서 생성한 파일에 추가)

### 3.3 Mock/Setup Required
- 없음 (상수 테스트 + dry-run 파싱)

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/render-analysis.ts` | Modify | SUPERSAW_ENERGY_GATE 상수, SECTION_AMP 수정 |
| `scripts/lib/render-analysis.test.ts` | Modify | 테스트 추가 |

### 4.2 Implementation Steps (Green Phase)
1. `const SUPERSAW_ENERGY_GATE = 0.15;` 상수 추가
2. supersaw 루프의 `if (energy < 0.4)` → `if (energy < SUPERSAW_ENERGY_GATE)`
3. SECTION_AMP의 intro/outro: 0.5 → 0.65

## 5. Edge Cases
- EC-1: 에너지가 0.15 미만인 경우에도 supersaw 스킵 (정상 동작)
