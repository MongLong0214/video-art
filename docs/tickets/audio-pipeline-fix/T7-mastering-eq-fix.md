# T7: 마스터링 실측 EQ + 다채널 다운믹스 + LUFS 검증

**PRD Ref**: PRD-audio-pipeline-fix > US-5
**Priority**: P1 (High)
**Size**: M (2-4h)
**Status**: Todo
**Depends On**: T6 (스템 구조 확정 후 다운믹스 채널 수 확정)

---

## 1. Objective
master.py가 합성 출력의 실제 스펙트럼을 측정하여 EQ를 적용하고, 다채널 다운믹스 + LUFS 범위 검증을 수행한다.

## 2. Acceptance Criteria
- [ ] AC-5.1: master.py가 입력 WAV의 실제 frequency_balance를 scipy 3-band으로 측정
- [ ] AC-5.2: Butterworth 3-band (250Hz/4kHz) → 밴드별 RMS 비율 → compute_eq_gains()
- [ ] AC-5.3: 10ch 또는 12ch 입력 시 스테레오 다운믹스 후 마스터링
- [ ] AC-5.4: LUFS -16 ~ -12 범위, 벗어나면 WARNING + 재정규화
- [ ] AC-E6: 12ch WAV 입력 정상 처리
- [ ] AC-E4: frequency_balance 합 != 1이어도 정규화

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `measure_frequency_balance returns dict with low/mid/hi` | Unit | 합성 WAV 입력 | {low: float, mid: float, hi: float} |
| 2 | `frequency_balance values sum to ~1.0` | Unit | 결과 검증 | abs(sum - 1.0) < 0.01 |
| 3 | `master_audio ignores analysis.json frequency_balance` | Unit | analysis.json에 극단 값 | 출력이 analysis 무관 |
| 4 | `10ch input downmixed to stereo` | Unit | 10ch WAV 입력 | 출력 2ch |
| 5 | `12ch input downmixed to stereo` | Unit | 12ch WAV 입력 | 출력 2ch |
| 6 | `output LUFS in -16 to -12 range` | Integration | 정상 입력 | -16 <= LUFS <= -12 |
| 7 | `LUFS out of range triggers re-normalization` | Unit | 극단 입력 | 재정규화 후 범위 내 |

### 3.2 Test File Location
- `audio/analyzer/test_master.py` (pytest)

### 3.3 Mock/Setup Required
- numpy로 합성 테스트 WAV 생성 (10ch, 12ch, 스테레오)
- pyloudnorm으로 LUFS 측정

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `audio/analyzer/master.py` | Modify | measure_frequency_balance() 추가, 다운믹스 수정, LUFS 검증 |
| `audio/analyzer/test_master.py` | Modify | pytest 테스트 추가 (기존 파일) |

### 4.2 Implementation Steps (Green Phase)

1. `measure_frequency_balance(y, sr)` 함수 추가:
   - 기존 `_crossover_filter()` 재사용 (250Hz/4kHz Butterworth)
   - 각 밴드 RMS 계산 → 비율 정규화 (sum=1)
   - 반환: `{"low": float, "mid": float, "hi": float}`

2. `master_audio()` 다운믹스 로직 수정:
   - `y.shape[1] > 2` → 스테레오 페어 합산 다운믹스 (기존 수정 유지)
   - 10ch, 12ch 모두 지원

3. `master_audio()` EQ 소스 변경:
   - `freq_balance = measure_frequency_balance(y_downmixed, sr)` (다운믹스 후 측정)
   - analysis.json의 frequency_balance는 더 이상 사용하지 않음
   - `master_audio()` 시그니처에서 `analysis_json_path`는 유지 (다른 필드 참조 가능성)

4. LUFS 범위 검증 추가:
   - `_lufs_normalize()` 후 실제 LUFS 재측정
   - -16 ~ -12 범위 밖이면 WARNING 로그 + 재정규화 1회 (max 1회, 이후에도 범위 밖이면 WARNING만)

### 4.3 Refactor Phase
- 없음 (`analysis_json_path` 시그니처 유지 — 내부에서 frequency_balance만 무시. 시그니처 변경은 NG5 범위)

## 5. Edge Cases
- EC-1: 입력이 무음 (RMS < 1e-6) → 기존 silence bypass 유지
- EC-2: frequency_balance 측정 결과 한 밴드가 0 → safe_gain() 클램프
- EC-3: 12ch 입력 홀수 채널 → 마지막 채널 L/R 균등 배분
