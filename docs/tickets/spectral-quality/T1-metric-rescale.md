# T1: Spectral Metric Rescaling (band-weighted MSD)

**PRD Ref**: PRD-spectral-quality > US-1
**Priority**: P1
**Size**: S
**Status**: Todo
**Depends On**: None

---

## 1. Objective
calibrate.py의 spectral convergence를 band-weighted MSD로 교체. 합성 vs 실제 비교에서 0-100 연속 분포.

## 2. Acceptance Criteria
- [ ] AC-1.1: 3-band MSD (low 0-250Hz w=0.3, mid 250-4kHz w=0.4, hi 4kHz+ w=0.3), max_lsd=20, 0-100
- [ ] AC-1.2: 기존 테스트 total_score ±10 이내. 임계값 재산정 허용
- [ ] AC-1.3: identical signals → ~100, orthogonal → >0

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases
| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `test_spectral_identical` | Unit | same WAV → spectral | ~100 (>95) |
| 2 | `test_spectral_orthogonal` | Unit | sine vs noise → spectral | >0 and <50 |
| 3 | `test_spectral_similar` | Unit | sine 440Hz vs 445Hz | >70 |
| 4 | `test_total_score_regression` | Unit | existing fixtures | ±10 of baseline |

### 3.2 Test File Location
- audio/analyzer/test_calibrate.py (기존 파일에 추가)

### 3.3 Mock/Setup Required
- conftest.py의 sine_wav, noise_wav fixtures

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| audio/analyzer/calibrate.py | Modify | spectral convergence → band-weighted MSD |
| audio/analyzer/test_calibrate.py | Modify | 새 테스트 추가 + 기존 임계값 조정 |

### 4.2 Implementation Steps (Green Phase)
1. `_band_weighted_msd(S_ref, S_synth, sr, freqs)` 함수 작성
2. composite_similarity 내 spectral 계산 교체
3. 기존 테스트 임계값 재산정

## 5. Edge Cases
- E1 (identical → 100), E2 (orthogonal → >0), E3 (silence → guard)
