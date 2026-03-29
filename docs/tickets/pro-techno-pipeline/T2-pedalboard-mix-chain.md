# T2: pedalboard 믹싱 체인 (mix-pro.py)

**Size**: L | **Depends**: T1 | **PRD**: US-2

## Goal
5개 스템 WAV를 pedalboard로 per-stem 이펙트 체인 + 마스터 버스 처리. 기존 `master.py`(scipy 3-band)를 pedalboard 기반으로 교체.

## New File: `audio/analyzer/mix-pro.py`

### CLI
```bash
python3 audio/analyzer/mix-pro.py \
  --stems-dir out/analysis/{name}/stems/ \
  --analysis out/analysis/{name}/analysis.json \
  --output out/analysis/{name}/pro/master.wav \
  [--reference ref.wav] \
  [--no-sidechain] \
  [--preset dark-techno]
```

### Per-Stem Chains (PRD §4.3)

| Stem | Chain | Key Params |
|------|-------|-----------|
| kick | HPF 30Hz → Compressor 4:1 → Gain +2dB | attack=5ms, release=80ms, threshold=-8dB |
| bass | HPF 25Hz → LPF 250Hz → Compressor 3:1 → **sidechain** | threshold=-10dB (sidechain: T3) |
| hat | HPF 3kHz → Compressor 2:1 → Reverb send 10% | attack=1ms, release=50ms, threshold=-15dB |
| synth | HPF 100Hz → LPF 8kHz → Compressor 3:1 → **sidechain** → Reverb 15% → Delay dotted-8th | threshold=-12dB |
| master | HPF 25Hz → Bus Comp 2:1 → Gain +1dB → Limiter -0.3dB | attack=30ms, release=200ms, threshold=-6dB |

### Architecture
```python
import numpy as np
import soundfile as sf
from pedalboard import (
    Pedalboard, Compressor, Gain, Limiter, Reverb, Delay,
    HighpassFilter, LowpassFilter,
)

def load_stems(stems_dir: str) -> dict[str, tuple[np.ndarray, int]]:
    """Load 5 stem WAVs."""

def build_kick_chain() -> Pedalboard: ...
def build_bass_chain() -> Pedalboard: ...
def build_hat_chain() -> Pedalboard: ...
def build_synth_chain() -> Pedalboard: ...
def build_master_chain() -> Pedalboard: ...

def process_stem(audio: np.ndarray, sr: int, chain: Pedalboard) -> np.ndarray:
    """Apply pedalboard chain to audio."""
    return chain(audio, sr)

def mix_stems(processed: dict[str, np.ndarray], levels: dict[str, float]) -> np.ndarray:
    """Sum stems with level adjustment."""

def main():
    stems = load_stems(args.stems_dir)
    # Per-stem processing
    processed = {}
    for name, (audio, sr) in stems.items():
        chain = globals()[f"build_{name}_chain"]()
        processed[name] = process_stem(audio, sr, chain)
    # Sidechain (T3 — placeholder: pass-through)
    # Mix
    mixed = mix_stems(processed, DEFAULT_LEVELS)
    # Master chain
    master = build_master_chain()
    final = master(mixed, sr)
    sf.write(args.output, final, sr)
```

### Stem Levels (기본 믹스 밸런스)
```python
DEFAULT_LEVELS = {
    "kick": 0.0,    # dB reference
    "bass": -2.0,
    "hat": -6.0,
    "synth": -4.0,
    "fx": -8.0,
}
```

### master.py 교체
- `master.py` 유지 (fallback)
- `mix-pro.py`가 스템+마스터 통합 처리
- 기존 `master.py` 호출부에 `mix-pro.py` 옵션 추가

## Acceptance Criteria
- [ ] AC-2.1: kick chain: HPF 30Hz + Compressor 4:1 + Gain
- [ ] AC-2.2: bass chain: HPF 25Hz + LPF 250Hz + Compressor (sidechain은 T3)
- [ ] AC-2.3: hat chain: HPF 3kHz + Compressor + Reverb 10%
- [ ] AC-2.4: synth chain: EQ + Compressor + Reverb + Delay
- [ ] AC-2.5: master chain: Bus Comp 2:1 + Limiter -0.3dB
- [ ] AC-2.6: 출력 WAV: stereo, 44100/48000Hz, peak < -0.3dBFS

## Test
```bash
python3 audio/analyzer/mix-pro.py \
  --stems-dir out/analysis/void-acid-carousel/stems/ \
  --analysis out/analysis/void-acid-carousel/analysis.json \
  --output /tmp/test-mix.wav
soxi /tmp/test-mix.wav  # stereo, correct SR
python3 -c "
import soundfile as sf; import numpy as np
x, sr = sf.read('/tmp/test-mix.wav')
peak = 20*np.log10(np.max(np.abs(x))+1e-10)
print(f'Peak: {peak:.1f} dBFS')
assert peak < -0.2, 'Limiter failed'
"
```
