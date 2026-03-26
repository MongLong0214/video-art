# T11: E2E Validation + A/B Comparison

**PRD Ref**: PRD-layer-decomposition-overhaul > US-4, §8.3, §9.3, §9.4
**Priority**: P2 (Medium)
**Size**: M
**Status**: Todo
**Depends On**: T7, T10

---

## 1. Objective

E2E 파이프라인 검증 + Variant A/B를 golden set에서 비교하여 production default를 결정할 데이터 수집.

## 2. Acceptance Criteria

- [ ] AC-1: Variant A E2E: input → pipeline → scene.json → preview → export 전체 동작
- [ ] AC-2: Variant B E2E: 동일 흐름
- [ ] AC-3: 비교 결과가 report와 manifest에 기록 (AC-4.4)
- [ ] AC-4: golden set 최소 5개 이미지 (PRD §8.2: simple portrait, single subject + clean bg, busy collage, known failure image, highly occluded frame-like composition)
- [ ] AC-5: 비교 지표: mean uniqueCoverage, retained count, pairwise overlap, runtime cost

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `variant-a e2e: simple image` | E2E | simple golden image | scene.json 생성, layers <= 8, manifest 존재 |
| 2 | `variant-a e2e: complex image` | E2E | complex golden image | scene.json 생성, uniqueCoverage > 2% |
| 3 | `variant-b e2e: simple image` | E2E | same simple image | identical archive structure |
| 4 | `should generate comparison report` | Integration | both variant results | report JSON with metrics |
| 5 | `should record metrics in manifest` | Unit | comparison data | all §9.3 metrics present |

### 3.2 Test File Location
- `scripts/lib/e2e-validation.test.ts` (신규, long-running → `vitest run --timeout 120000`)

### 3.3 Mock/Setup Required
- golden set images in `test/fixtures/golden/` (3개)
- Replicate API key (실 호출 또는 cached fixtures)

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/compare-variants.ts` | Create | A/B 비교 스크립트 |
| `test/fixtures/golden/` | Create | golden set 이미지 3개 |

### 4.2 Implementation Steps (Green Phase)
1. golden set 이미지 3개 수집 + SHA-256 기록
2. `compare-variants.ts`: 두 variant 순차 실행 → 결과 비교 → report JSON
3. 비교 지표 계산: mean uniqueCoverage, retained count, overlap, runtime
4. report를 `out/comparison/` 에 저장

### 4.3 Refactor Phase
- npm script `pipeline:compare` 추가

## 5. Edge Cases
- EC-1: Variant B가 ZoeDepth 실패로 fallback → Variant A와 동일 결과 → 보고
- EC-2: golden set 이미지에 API 호출 비용 → cached fixture로 대체 가능

## 6. Review Checklist
- [ ] Red: 테스트 실행 → FAILED 확인됨
- [ ] Green: 테스트 실행 → PASSED 확인됨
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
