# T5: Layer Quality Metrics (M9-M10)

**PRD Ref**: PRD-autoresearch-layer > US-1, §4.5 Tier 4
**Priority**: P1
**Size**: S
**Status**: Todo
**Depends On**: None

---

## 1. Objective

레이어 분해 품질 메트릭 2종 구현: M9 Layer Independence, M10 Role Coherence. decomposition-manifest.json에서 데이터 추출.

## 2. Acceptance Criteria

- [ ] AC-1: M9 — `clamp01(mean(uniqueCoverage) × (1 - duplicateHeavyRatio))`
- [ ] AC-2: M10 — `clamp01(assignedRatio×0.6 + bgPlateBonus×0.2 + diversityRatio×0.2)`
- [ ] AC-3: manifest JSON 파싱 + 누락 필드 graceful fallback
- [ ] AC-4: manifest 없으면 M9=0, M10=0

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `M9 perfect independence` | Unit | all uniqueCoverage > 10%, no duplicates | ≈ 1.0 |
| 2 | `M9 all duplicate heavy` | Unit | all uniqueCoverage < 2% | 0.0 |
| 3 | `M9 mixed` | Unit | 50% good, 50% duplicate | ~0.25 |
| 4 | `M10 all roles assigned + bgplate` | Unit | 6/6 roles, bgplate exists | 1.0 |
| 5 | `M10 no roles` | Unit | 0 roles assigned | 0.0 |
| 6 | `M10 partial roles no bgplate` | Unit | 3/5 assigned, no bgplate | ~0.36+0.1 |
| 7 | `manifest missing` | Unit | file not found | M9=0, M10=0 |
| 8 | `manifest malformed` | Unit | invalid JSON | M9=0, M10=0 |

### 3.2 Test File Location
- `scripts/research/metrics/layer-quality.test.ts`

### 3.3 Mock/Setup Required
- mock manifest JSON objects (no file I/O needed for unit tests)

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/research/metrics/layer-quality.ts` | Create | M9 + M10 |

### 4.2 Implementation Steps (Green Phase)
1. `parseManifest(manifestPath)` — JSON read + schema validation
2. `computeLayerIndependence(manifest)` → M9
3. `computeRoleCoherence(manifest)` → M10
4. clamp01 적용

## 5. Edge Cases
- EC-1: manifest 없음 → (0, 0) 반환
- EC-2: finalLayers 빈 배열 → (0, 0)
- EC-3: uniqueCoverage 필드 누락 → 0으로 처리
