# T9: 303-only mastering + technical QC

**Size**: M | **Depends**: T8 | **PRD**: US-4, US-5

## Goal
303-only 출력이 commercially usable technical spec을 만족하도록 loudness, peak, stereo, artifact QC를 고정한다.

## Changes

### 1. mastering path
- LUFS target
- peak ceiling
- excessive low-end / harshness 경고

### 2. technical audit artifact
- LUFS
- peak
- RMS
- stereo width
- clipping count

### 3. render integration
- `render-303` 완료 시 QC JSON 저장

## Acceptance Criteria
- [ ] AC-9.1: master output이 -16 ~ -12 LUFS 범위에 들어온다.
- [ ] AC-9.2: peak <= -0.3 dBFS.
- [ ] AC-9.3: QC JSON artifact가 생성된다.
- [ ] AC-9.4: clipping / silent render가 hard fail 또는 warning으로 검출된다.

## Test
```bash
uv run --with numpy --with soundfile --with scipy --with pyloudnorm --with pytest python -m pytest audio/analyzer/test_master.py -q
```

