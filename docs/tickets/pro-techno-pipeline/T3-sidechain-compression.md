# T3: 사이드체인 컴프레션 (Python envelope follower)

**Size**: M | **Depends**: T1 | **PRD**: US-2 (AC-2.2, AC-2.6)

## Goal
킥 envelope → 베이스/신디 볼륨 덕킹. pedalboard에 사이드체인 입력이 없으므로 Python에서 직접 구현.

## Implementation: `audio/analyzer/sidechain.py`

### 핵심 함수
```python
def extract_kick_envelope(
    kick: np.ndarray,
    sr: int,
    attack_ms: float = 1.0,
    release_ms: float = 100.0,
) -> np.ndarray:
    """Compute smoothed envelope from kick signal."""
    env = np.abs(kick).max(axis=-1) if kick.ndim == 2 else np.abs(kick)
    attack_coeff = np.exp(-1 / (attack_ms * sr / 1000))
    release_coeff = np.exp(-1 / (release_ms * sr / 1000))
    smoothed = np.zeros_like(env)
    for i in range(1, len(env)):
        coeff = attack_coeff if env[i] > smoothed[i-1] else release_coeff
        smoothed[i] = coeff * smoothed[i-1] + (1 - coeff) * env[i]
    return smoothed / (np.max(smoothed) + 1e-10)

def apply_sidechain(
    target: np.ndarray,
    envelope: np.ndarray,
    depth: float = 0.8,
) -> np.ndarray:
    """Duck target based on trigger envelope. depth=0.8 → -14dB ducking."""
    gain = 1.0 - (envelope * depth)
    if target.ndim == 2:
        return target * gain[:, np.newaxis]
    return target * gain
```

### 장르별 프리셋
```python
SIDECHAIN_PRESETS = {
    "dark-techno":  {"attack_ms": 0.5, "release_ms": 80,  "depth": 0.85},
    "hard-techno":  {"attack_ms": 1.0, "release_ms": 100, "depth": 0.8},
    "melodic":      {"attack_ms": 2.0, "release_ms": 150, "depth": 0.6},
    "industrial":   {"attack_ms": 0.5, "release_ms": 60,  "depth": 0.9},
    "psytrance":    {"attack_ms": 1.0, "release_ms": 120, "depth": 0.7},
}
```

### mix-pro.py 통합
T2의 `mix-pro.py`에서 sidechain 적용 위치:
```python
# After per-stem chain processing, before mix
kick_env = extract_kick_envelope(processed["kick"], sr, **preset)
processed["bass"] = apply_sidechain(processed["bass"], kick_env, depth=preset["depth"])
processed["synth"] = apply_sidechain(processed["synth"], kick_env, depth=preset["depth"] * 0.7)
```

### Edge Cases
- E5 (PRD): kick 무음 → `np.max(smoothed) < 1e-6` → sidechain 비활성
- Stereo kick → mono envelope (peak of L/R)
- 매우 짧은 kick (< 10ms) → release가 envelope를 지배 → 정상 동작

## Acceptance Criteria
- [ ] AC-3.1: kick onset에서 bass amplitude ≤ 20% (depth=0.8)
- [ ] AC-3.2: kick 무음 시 sidechain 비활성 (target 변경 없음)
- [ ] AC-3.3: attack < 5ms, release 80-150ms 범위 지원
- [ ] AC-3.4: 5개 장르 프리셋 제공

## Test
```python
# Unit test
import numpy as np
from sidechain import extract_kick_envelope, apply_sidechain

sr = 44100
# Synthetic kick: 50ms burst every beat at 128 BPM
kick = np.zeros(sr * 4)  # 4 seconds
beat_samples = int(sr * 60 / 128)
for i in range(0, len(kick), beat_samples):
    end = min(i + int(sr * 0.05), len(kick))
    kick[i:end] = np.sin(2 * np.pi * 50 * np.arange(end - i) / sr) * 0.8

# Bass: continuous sine
bass = np.sin(2 * np.pi * 80 * np.arange(sr * 4) / sr) * 0.5

env = extract_kick_envelope(kick, sr, attack_ms=1.0, release_ms=100.0)
ducked = apply_sidechain(bass, env, depth=0.8)

# At kick onset, bass should be ducked
onset_idx = 0
assert np.max(np.abs(ducked[onset_idx:onset_idx+100])) < 0.15  # < 20% of 0.5
# Between kicks, bass should recover
mid_idx = beat_samples // 2
assert np.max(np.abs(ducked[mid_idx:mid_idx+100])) > 0.35  # > 70% of 0.5
```
