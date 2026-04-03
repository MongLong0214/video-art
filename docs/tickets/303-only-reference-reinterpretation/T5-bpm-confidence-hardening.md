# T5: BPM ensemble + confidence hardening

**Size**: M | **Depends**: — | **PRD**: US-1

## Goal
현재 genre-biased half/double correction을 제거하고, benchmark 기반으로 BPM ensemble과 confidence model을 commercial 수준으로 안정화한다.

## Changes

### 1. `audio/analyzer/analyze_track.py`
- `cross_validate_bpm()` 재설계
- hard-coded genre prior 제거 또는 optional prior화
- detector disagreement를 confidence에 반영

### 2. benchmark fixtures
- 최소 `70`, `90`, `124`, `140`, `174` BPM synthetic/real fixtures
- half-time / double-time confusion 케이스 포함

### 3. analyzer result contract
- `bpm.value`
- `bpm.confidence`
- `bpm.sources`
- `bpm.warnings`

## Acceptance Criteria
- [ ] AC-5.1: `174 BPM -> 87` 같은 systematic 오차가 regression test로 막힌다.
- [ ] AC-5.2: benchmark set에서 median absolute error <= 1.0 BPM.
- [ ] AC-5.3: disagreement가 큰 경우 confidence가 낮아진다.
- [ ] AC-5.4: fallback default BPM 사용은 명시적 warning을 남긴다.

## Test
```bash
uv run --with numpy --with librosa --with soundfile --with scipy --with pytest python -m pytest audio/analyzer/test_bpm.py -q
```

