# T17: Python 마스터링 체인 (master.py)

**PRD Ref**: PRD-track-analyzer-phase2-completion > US-2
**Priority**: P1
**Size**: M
**Status**: Todo
**Depends On**: None

---

## 1. Objective
3-band EQ + 멀티밴드 컴프 + LUFS 리미터 Python 후처리. spectral balance 개선.

## 2. Acceptance Criteria
- [ ] AC-1: master.py — 3-band crossover EQ (250Hz/4kHz) + multiband comp + limiter (AC-2.1)
- [ ] AC-2: EQ 정책: 분석 기반 동적. gain = 10*log10(target/current). mid max +8dB, high max +6dB. fallback: mid +6dB, high +4dB (AC-2.2)
- [ ] AC-3: frequency_balance → target balance 계산 (AC-2.3)
- [ ] AC-4: LUFS -14 타겟 리미팅 (AC-2.4)
- [ ] AC-5: render-analysis.ts 완료 후 자동 호출. --no-master 비활성화 (AC-2.5)
- [ ] AC-6: 전/후 score 비교. reference_path from analysis.json or --reference (AC-2.6)
- [ ] AC-7: Non-regression gate: score -3점 이상 하락 → 파기+원본유지. peak > -0.3dBFS → 리미터 재적용 (AC-2.7)

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases
| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `test_eq_mid_boost` | Unit | low-only signal → master | mid band gain applied |
| 2 | `test_eq_clamp_max` | Unit | extreme imbalance | mid <= +8dB, high <= +6dB |
| 3 | `test_eq_fallback_null_balance` | Unit | freq_balance=null | mid +6dB, high +4dB |
| 4 | `test_lufs_normalization` | Unit | loud input | output LUFS ≈ -14 |
| 5 | `test_silence_bypass` | Unit | silent input | bypass + warning |
| 6 | `test_non_regression_gate` | Unit | mastering worsens score | original preserved |
| 7 | `test_peak_limiter` | Unit | peak > -0.3dBFS | re-limited |
| 8 | `master integration` | Integration | full pipeline | mastered WAV exists |

### 3.2 Test File Location
- audio/analyzer/test_master.py

### 3.3 Mock/Setup Required
- numpy generated test signals (sine + noise combos)

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| audio/analyzer/master.py | Create | 3-band EQ + comp + limiter |
| audio/analyzer/test_master.py | Create | Unit tests |
| scripts/render-analysis.ts | Modify | master.py 자동 호출 + --no-master |

### 4.2 Implementation Steps (Green Phase)
1. master.py: 3-band butterworth crossover (scipy.signal)
2. Per-band gain calculation from frequency_balance
3. Multiband compression (per-band RMS envelope)
4. LUFS limiter (pyloudnorm)
5. Non-regression gate: calibrate before/after
6. render-analysis.ts: master.py 호출 추가

## 5. Edge Cases
- E3 (무음 → bypass), E4 (null balance → fallback), E6 (corrupt WAV), E7 (disk space)

## 6. Review Checklist
- [ ] Red → Green → Refactor
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
