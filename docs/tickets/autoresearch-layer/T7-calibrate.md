# T7: Calibrate (Noise Floor Measurement)

**PRD Ref**: PRD-autoresearch-layer > US-3, §4.5.0
**Priority**: P0 (Blocker)
**Size**: M
**Status**: Todo
**Depends On**: T6

---

## 1. Objective

동일 config로 N회(default 10) 파이프라인을 반복 실행하여 메트릭별 μ, σ를 측정하고 δ_min = 2σ를 설정하는 calibration 스크립트 구현.

## 2. Acceptance Criteria

- [ ] AC-1: `calibrate.ts`가 동일 config로 N회 실험 반복 (default N=10, --runs로 조정)
- [ ] AC-2: 메트릭별 μ, σ, min, max 계산
- [ ] AC-3: δ_min = 2 × max(σ_composite, 0.005) (최소 0.01 보장)
- [ ] AC-4: `.cache/research/calibration.json`에 결과 저장
- [ ] AC-5: Replicate model version 기록
- [ ] AC-6: `npm run research:calibrate` CLI

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `computeStats` | Unit | [0.8, 0.85, 0.82] → μ, σ | μ≈0.823, σ≈0.025 |
| 2 | `deltaMin from sigma` | Unit | σ=0.005 → δ_min | 0.01 |
| 3 | `deltaMin minimum floor` | Unit | σ=0.001 → δ_min | 0.01 (floor) |
| 4 | `calibrationJson schema` | Unit | JSON output validation | all required fields |
| 5 | `calibrate integration` | Integration | mock pipeline 3회 → calibration.json | 파일 생성 + 내용 정확 |

### 3.2 Test File Location
- `scripts/research/calibrate.test.ts`

### 3.3 Mock/Setup Required
- vi.mock() for run-once pipeline execution (API 호출 방지)
- mock EvalResult 반환

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/research/calibrate.ts` | Create | calibration script |
| `scripts/research/calibrate.test.ts` | Create | 테스트 |

### 4.2 Implementation Steps (Green Phase)
1. `computeStats(values: number[])` → { mean, std, min, max }
2. N회 run-once 실행 (API 호출 포함)
3. 10 메트릭 + composite score 각각 stats 계산
4. δ_min = max(2 × composite_σ, 0.01)
5. calibration.json 저장
6. CLI: `--runs N` 옵션

## 5. Edge Cases
- EC-1: N < 3 → 경고 (통계 불안정)
- EC-2: 모든 run이 동일 score → σ=0 → δ_min=0.01 (floor)
- EC-3: 일부 run crash → crash 제외하고 나머지로 계산 + 경고
