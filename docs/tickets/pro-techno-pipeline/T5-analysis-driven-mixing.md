# T5: 분석 기반 자동 믹싱

**Size**: M | **Depends**: T2 | **PRD**: US-4

## Goal
analysis.json의 frequency_balance, energy_curve, dynamic_range, loudness 데이터를 mix-pro.py의 이펙트 파라미터에 매핑. 레퍼런스 트랙 스펙트럼에 자동 근접.

## Analysis Fields → Mix Parameters

### AC-4.1: frequency_balance → per-stem EQ

```python
def compute_stem_eq(frequency_balance: dict, stem: str) -> dict:
    """Map reference frequency balance to per-stem EQ adjustments."""
    low = frequency_balance.get("low", 0.33)
    mid = frequency_balance.get("mid", 0.33)
    hi = frequency_balance.get("hi", 0.33)

    # Target: match reference balance
    # If reference is bass-heavy (low > 0.4), boost kick/bass, cut synth lows
    adjustments = {
        "kick": {"hpf": 30, "gain_db": 2.0 + (low - 0.33) * 6},
        "bass": {"hpf": 25, "lpf": 200 + (low - 0.33) * 100, "gain_db": (low - 0.33) * 4},
        "hat":  {"hpf": 3000 - (hi - 0.33) * 1000, "gain_db": (hi - 0.33) * 3},
        "synth": {"hpf": 100 + (low - 0.33) * 50, "lpf": 8000 + (hi - 0.33) * 2000},
        "fx":   {"gain_db": -8.0},
    }
    return adjustments[stem]
```

### AC-4.2: energy_curve → 볼륨 오토메이션

```python
def compute_volume_automation(
    energy_curve: list[float],
    duration: float,
    sr: int,
) -> np.ndarray:
    """Interpolate energy curve to sample-level volume automation."""
    # energy_curve: [0.3, 0.5, 0.8, 1.0, 0.7, ...] per section
    # Interpolate to audio length
    x = np.linspace(0, 1, len(energy_curve))
    x_new = np.linspace(0, 1, int(duration * sr))
    return np.interp(x_new, x, energy_curve)
```

적용 대상: synth, fx 스템 (kick/bass/hat은 패턴이 이미 에너지 반영)

### AC-4.3: dynamic_range → 컴프레서 파라미터

```python
def compute_compressor_params(dynamic_range: float) -> dict:
    """Map dynamic range to compressor settings.

    dynamic_range (dB): higher = more dynamic = less compression needed
    Typical techno: 6-12 dB
    """
    if dynamic_range > 10:
        return {"threshold_db": -12, "ratio": 2.0}  # light
    elif dynamic_range > 6:
        return {"threshold_db": -8, "ratio": 3.0}   # moderate
    else:
        return {"threshold_db": -6, "ratio": 4.0}    # heavy (already compressed ref)
```

### AC-4.4: loudness.integrated → 마스터 LUFS

```python
def compute_master_target(loudness: dict) -> float:
    """Target LUFS from reference analysis."""
    integrated = loudness.get("integrated", -14.0)
    # Clamp to reasonable range
    return max(min(integrated, -8.0), -18.0)
```

마스터 Limiter threshold 조정:
- target_lufs = -14 → limiter threshold = -0.3dB (기본)
- target_lufs = -10 → limiter threshold = -0.1dB + Gain 증가

## mix-pro.py 통합

```python
def build_adaptive_chains(analysis: dict) -> dict[str, Pedalboard]:
    """Build per-stem chains adjusted by analysis data."""
    freq_bal = analysis.get("frequency_balance")
    dyn_range = analysis.get("dynamic_range", 8.0)
    loudness = analysis.get("loudness", {})

    comp_params = compute_compressor_params(dyn_range)
    target_lufs = compute_master_target(loudness)

    # Override default chain params with analysis-derived values
    chains = {
        "kick": build_kick_chain(**compute_stem_eq(freq_bal, "kick")),
        "bass": build_bass_chain(**compute_stem_eq(freq_bal, "bass"), **comp_params),
        "hat": build_hat_chain(**compute_stem_eq(freq_bal, "hat")),
        "synth": build_synth_chain(**compute_stem_eq(freq_bal, "synth"), **comp_params),
        "master": build_master_chain(target_lufs=target_lufs),
    }
    return chains
```

## Acceptance Criteria
- [ ] AC-5.1: frequency_balance → 스템별 EQ 자동 조정 (HPF/LPF/gain)
- [ ] AC-5.2: energy_curve → synth/fx 볼륨 오토메이션
- [ ] AC-5.3: dynamic_range → 컴프레서 threshold/ratio 자동 설정
- [ ] AC-5.4: loudness.integrated → 마스터 LUFS 타겟
- [ ] AC-5.5: analysis 필드 누락 시 안전한 기본값 사용

## Test
```python
# Unit: frequency_balance mapping
eq = compute_stem_eq({"low": 0.5, "mid": 0.3, "hi": 0.2}, "kick")
assert eq["gain_db"] > 2.0  # bass-heavy ref → kick boost

# Unit: dynamic_range mapping
params = compute_compressor_params(5.0)  # compressed reference
assert params["ratio"] == 4.0  # heavy compression to match

# Integration: A/B test
# Run mix-pro.py with and without --analysis, compare calibrate scores
```
