# T7: E2E 테스트 + calibrate 스코어 검증

**Size**: M | **Depends**: T6 | **PRD**: §8

## Goal
전체 파이프라인 E2E 검증 + calibrate.py 스코어 ≥ 80 달성 확인.

## Test Plan

### 7.1 Unit Tests (Python)

**File**: `audio/analyzer/test_mix_pro.py`

```python
# pedalboard chain tests
def test_kick_chain_rms():
    """Kick chain should boost RMS (gain +2dB)."""

def test_bass_chain_frequency():
    """Bass chain should cut > 250Hz."""

def test_master_limiter():
    """Master output peak < -0.3 dBFS."""

def test_sidechain_ducking():
    """Bass amplitude < 20% at kick onset (depth=0.8)."""

def test_sidechain_silent_kick():
    """No ducking when kick is silent."""

def test_stem_sum_coherence():
    """Sum of processed stems ≈ master (before master chain)."""
```

### 7.2 Integration Tests (TS)

**File**: `scripts/render-pro.test.ts`

```ts
describe("render-pro", () => {
  test("generates 5 stem WAVs", async () => {
    // dry-run or actual render
    // Assert: kick.wav, bass.wav, hat.wav, synth.wav, fx.wav exist
    // Assert: all same SR, stereo, same duration
  });

  test("full pipeline produces master.wav", async () => {
    // Assert: pro/master.wav exists, size > 0
  });

  test("processing time < 30s for 30s track", async () => {
    const start = Date.now();
    await renderPro(testDir, {});
    assert(Date.now() - start < 30_000);
  });

  test("--mode synth produces synth-only output", async () => {
    // No sample_player events in score
  });

  test("graceful fallback on missing stem", async () => {
    // Delete one stem, run mix → should still produce master
  });
});
```

### 7.3 E2E: calibrate Score Gate

**Target scores** (from PRD §11):

| Metric | Baseline | Target | Gate |
|--------|----------|--------|------|
| total_score | 72.3 | 80+ | FAIL < 75 |
| envelope | 7.2 | 50+ | FAIL < 30 |
| onset_f1 | — | 60+ | WARN < 50 |

**E2E script**:
```bash
#!/bin/bash
# e2e-pro-techno.sh
set -e

REF_DIR="out/analysis/void-acid-carousel"
REF_WAV="audio/references/void-acid-carousel.wav"

echo "=== E2E: Pro Techno Pipeline ==="

# Run full pipeline
time npx tsx scripts/render-pro.ts "$REF_DIR" \
  --reference "$REF_WAV" \
  --style hard-techno

# Parse calibrate output
SCORE=$(python3 audio/analyzer/calibrate.py \
  "$REF_DIR/pro/master.wav" \
  --reference "$REF_WAV" \
  --json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['total_score'])")

echo "Score: $SCORE"
python3 -c "
score = $SCORE
assert score >= 75, f'FAIL: total_score {score} < 75'
print(f'PASS: total_score {score} >= 75')
"
```

### 7.4 Regression Gate
- 기존 `--mode synth` 결과가 T1 이전 베이스라인 대비 악화되지 않음
- calibrate total_score ≥ 72.3 (현재 베이스라인)

## Acceptance Criteria
- [ ] AC-7.1: Python unit tests 전체 통과
- [ ] AC-7.2: TS integration tests 전체 통과
- [ ] AC-7.3: E2E calibrate total_score ≥ 75 (hard gate)
- [ ] AC-7.4: E2E calibrate envelope ≥ 30 (hard gate)
- [ ] AC-7.5: 기존 synth-mode regression: score ≥ 72 (베이스라인)
- [ ] AC-7.6: 처리 시간 < 30s gate

## Success Criteria
PRD §11 목표 80+ 달성 시 → "Production Ready" 라벨. 75-80 → 추가 이터레이션 티켓 생성.
