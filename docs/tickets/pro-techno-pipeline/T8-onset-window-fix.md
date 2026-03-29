# T8: calibrate.py onset windowing 버그 수정 + 타이밍 개선

**Size**: M | **Depends**: T7 | **PRD**: v0.2

## Problem
calibrate.py onset F1 비교 시 335초 레퍼런스 전체의 onset을 30초 합성 결과와 매칭.
ref_onsets 중 30초 이후 건은 절대 매칭 불가 → recall 극도로 낮음 (attacks=9.4).

## Root Cause
```python
# calibrate.py line 86-87 — 전체 ref에서 onset 검출
ref_onsets = librosa.onset.onset_detect(y=y_ref, sr=sr, units='time')
synth_onsets = librosa.onset.onset_detect(y=y_synth, sr=sr, units='time')
```
ref가 335초, synth가 30초면 ref_onsets ~2000개 중 ~200개만 0-30초 범위.
recall = matched / 2000 → 최대 10%.

## Fix

### 1. calibrate.py — onset 윈도우 필터링
```python
synth_dur = len(y_synth) / sr
ref_onsets = ref_onsets[ref_onsets <= synth_dur]  # 합성 길이로 클리핑
```

### 2. calibrate.py — chroma DTW 길이 정규화
chroma도 같은 이슈. ref chroma를 synth 길이로 트리밍:
```python
synth_frames = chroma_synth.shape[1]
chroma_ref_trimmed = chroma_ref[:, :synth_frames]
```

## TDD Spec
- [ ] TC-8.1: onset F1 — 동일 WAV 비교 시 score ≥ 90
- [ ] TC-8.2: onset F1 — 335초 ref vs 30초 synth, ref_onsets 필터링 확인
- [ ] TC-8.3: chroma DTW — 길이 불일치 시 트리밍 적용 확인
- [ ] TC-8.4: 기존 MFCC/spectral/envelope 점수 regression 없음

## AC
- [ ] AC-8.1: onset 비교 시 ref_onsets ≤ synth_duration 필터링
- [ ] AC-8.2: attacks score ≥ 30 (void-acid-carousel 기준)
- [ ] AC-8.3: total_score regression 없음 (≥ 69)
