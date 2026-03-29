#!/usr/bin/env python3
"""Pro mixing chain: 5-stem pedalboard processing + sidechain + master.

Replaces master.py for pro pipeline. Loads individual stem WAVs,
applies per-stem effect chains, sidechain ducking, and master bus.

Usage:
  python3 mix-pro.py --stems-dir <dir> --analysis <json> --output <wav> \
    [--style hard-techno] [--no-sidechain] [--reference ref.wav]
"""

import argparse
import json
import os
import sys
from typing import Optional
import numpy as np
import soundfile as sf
from pedalboard import (
    Pedalboard, Compressor, Gain, Limiter, Reverb, Delay,
    HighpassFilter, LowpassFilter,
)

# ---------------------------------------------------------------------------
# Sidechain presets (T3)
# ---------------------------------------------------------------------------
SIDECHAIN_PRESETS = {
    "dark-techno":  {"attack_ms": 0.5, "release_ms": 80,  "depth": 0.85},
    "hard-techno":  {"attack_ms": 1.0, "release_ms": 100, "depth": 0.8},
    "melodic":      {"attack_ms": 2.0, "release_ms": 150, "depth": 0.6},
    "industrial":   {"attack_ms": 0.5, "release_ms": 60,  "depth": 0.9},
    "psytrance":    {"attack_ms": 1.0, "release_ms": 120, "depth": 0.7},
}

# Default stem mix levels (dB relative to kick)
DEFAULT_LEVELS = {
    "kick": 0.0,
    "bass": -2.0,
    "hat": -6.0,
    "synth": -4.0,
    "fx": -8.0,
}

STEM_NAMES = ["kick", "bass", "hat", "synth", "fx"]


# ---------------------------------------------------------------------------
# Stem loading
# ---------------------------------------------------------------------------
def load_stems(stems_dir: str) -> dict:
    """Load 5 stem WAVs. Returns {name: (audio_float32, sr)}."""
    stems = {}
    for name in STEM_NAMES:
        wav_path = os.path.join(stems_dir, f"stem-{name}.wav")
        if not os.path.exists(wav_path):
            print(f"  [warn] Missing stem: {wav_path}")
            continue
        audio, sr = sf.read(wav_path, dtype="float32")
        # Ensure stereo (samples, 2)
        if audio.ndim == 1:
            audio = np.column_stack([audio, audio])
        stems[name] = (audio, sr)
    return stems


# ---------------------------------------------------------------------------
# Per-stem effect chains (PRD §4.3)
# ---------------------------------------------------------------------------
def build_kick_chain(hpf_hz=30, threshold_db=-8, ratio=4.0,
                     gain_db=2.0, **_kw) -> Pedalboard:
    return Pedalboard([
        HighpassFilter(cutoff_frequency_hz=hpf_hz),
        Compressor(threshold_db=threshold_db, ratio=ratio,
                   attack_ms=5.0, release_ms=80.0),
        Gain(gain_db=gain_db),
    ])


def build_bass_chain(hpf_hz=25, lpf_hz=250, threshold_db=-10,
                     ratio=3.0, **_kw) -> Pedalboard:
    return Pedalboard([
        HighpassFilter(cutoff_frequency_hz=hpf_hz),
        LowpassFilter(cutoff_frequency_hz=lpf_hz),
        Compressor(threshold_db=threshold_db, ratio=ratio,
                   attack_ms=10.0, release_ms=100.0),
    ])


def build_hat_chain(hpf_hz=3000, threshold_db=-15, ratio=2.0,
                    reverb_wet=0.1, **_kw) -> Pedalboard:
    return Pedalboard([
        HighpassFilter(cutoff_frequency_hz=hpf_hz),
        Compressor(threshold_db=threshold_db, ratio=ratio,
                   attack_ms=1.0, release_ms=50.0),
        Reverb(room_size=0.15, wet_level=reverb_wet),
    ])


def build_synth_chain(hpf_hz=100, lpf_hz=8000, threshold_db=-12,
                      ratio=3.0, reverb_wet=0.15, delay_sec=0.375,
                      **_kw) -> Pedalboard:
    return Pedalboard([
        HighpassFilter(cutoff_frequency_hz=hpf_hz),
        LowpassFilter(cutoff_frequency_hz=lpf_hz),
        Compressor(threshold_db=threshold_db, ratio=ratio,
                   attack_ms=10.0, release_ms=100.0),
        Reverb(room_size=0.3, wet_level=reverb_wet),
        Delay(delay_seconds=delay_sec, feedback=0.2, mix=0.1),
    ])


def build_fx_chain(**_kw) -> Pedalboard:
    return Pedalboard([
        HighpassFilter(cutoff_frequency_hz=80),
        Reverb(room_size=0.5, wet_level=0.25),
    ])


def build_master_chain(threshold_db=-6, ratio=2.0, gain_db=1.0,
                       limiter_db=-0.3, **_kw) -> Pedalboard:
    return Pedalboard([
        HighpassFilter(cutoff_frequency_hz=25),
        Compressor(threshold_db=threshold_db, ratio=ratio,
                   attack_ms=30.0, release_ms=200.0),
        Gain(gain_db=gain_db),
        Limiter(threshold_db=limiter_db),
        # Pedalboard Limiter ceiling is 0dBFS; apply gain for true ceiling
        Gain(gain_db=limiter_db),
    ])


CHAIN_BUILDERS = {
    "kick": build_kick_chain,
    "bass": build_bass_chain,
    "hat": build_hat_chain,
    "synth": build_synth_chain,
    "fx": build_fx_chain,
}


# ---------------------------------------------------------------------------
# Sidechain compression (T3)
# ---------------------------------------------------------------------------
def extract_kick_envelope(kick: np.ndarray, sr: int,
                          attack_ms: float = 1.0,
                          release_ms: float = 100.0) -> np.ndarray:
    """Compute smoothed amplitude envelope from kick signal."""
    # Mono envelope from peak of stereo channels
    if kick.ndim == 2:
        env = np.max(np.abs(kick), axis=1)
    else:
        env = np.abs(kick)

    if np.max(env) < 1e-6:
        return np.zeros_like(env)

    attack_coeff = np.exp(-1.0 / (attack_ms * sr / 1000))
    release_coeff = np.exp(-1.0 / (release_ms * sr / 1000))

    smoothed = np.zeros_like(env)
    for i in range(1, len(env)):
        if env[i] > smoothed[i - 1]:
            smoothed[i] = attack_coeff * smoothed[i - 1] + (1 - attack_coeff) * env[i]
        else:
            smoothed[i] = release_coeff * smoothed[i - 1] + (1 - release_coeff) * env[i]

    peak = np.max(smoothed)
    if peak < 1e-6:
        return np.zeros_like(env)
    return smoothed / peak


def apply_sidechain(target: np.ndarray, envelope: np.ndarray,
                    depth: float = 0.8) -> np.ndarray:
    """Duck target signal based on kick envelope."""
    gain = 1.0 - (envelope * depth)
    if target.ndim == 2:
        return target * gain[:, np.newaxis]
    return target * gain


# ---------------------------------------------------------------------------
# Analysis-driven parameter adaptation (T5)
# ---------------------------------------------------------------------------
def adapt_params_from_analysis(analysis: Optional[dict]) -> dict:
    """Derive mixing parameters from analysis.json fields.

    AC-4.1: frequency_balance → per-stem EQ
    AC-4.3: dynamic_range → compressor threshold/ratio
    AC-4.4: loudness.integrated → master LUFS target
    """
    if analysis is None:
        return {}

    params = {}
    freq_bal = analysis.get("frequency_balance")
    dyn = analysis.get("dynamic_range")
    loudness = analysis.get("loudness")

    # AC-4.1: frequency_balance → EQ adjustments
    if freq_bal:
        low = freq_bal.get("low", 0.33)
        hi = freq_bal.get("hi", 0.33)
        params["kick_gain_db"] = 2.0 + (low - 0.33) * 6
        params["bass_lpf_hz"] = 200 + (low - 0.33) * 100
        params["hat_hpf_hz"] = max(2000, 3000 - (hi - 0.33) * 1000)
        params["synth_hpf_hz"] = 100 + (low - 0.33) * 50
        params["synth_lpf_hz"] = 8000 + (hi - 0.33) * 2000

    # AC-4.3: dynamic_range → compressor params
    if dyn:
        crest = dyn.get("crest", 8.0)
        if crest > 10:
            params["comp_ratio"] = 2.0
            params["comp_threshold"] = -12
        elif crest > 6:
            params["comp_ratio"] = 3.0
            params["comp_threshold"] = -8
        else:
            params["comp_ratio"] = 4.0
            params["comp_threshold"] = -6

    # AC-4.4: loudness → master target
    if loudness:
        integrated = loudness.get("integrated", -14.0)
        target = max(min(integrated, -8.0), -18.0)
        params["master_limiter_db"] = -0.3 if target <= -12 else -0.1

    return params


def compute_volume_automation(energy_curve: Optional[list],
                              duration_samples: int,
                              sr: int) -> Optional[np.ndarray]:
    """AC-4.2: Interpolate energy_curve to sample-level volume automation."""
    if not energy_curve or len(energy_curve) < 2:
        return None
    x = np.linspace(0, 1, len(energy_curve))
    x_new = np.linspace(0, 1, duration_samples)
    automation = np.interp(x_new, x, energy_curve)
    # Normalize to 0.5–1.0 range (avoid complete silence)
    lo, hi = np.min(automation), np.max(automation)
    if hi - lo < 1e-6:
        return None
    return 0.5 + 0.5 * (automation - lo) / (hi - lo)


# ---------------------------------------------------------------------------
# Reference envelope matching
# ---------------------------------------------------------------------------
def match_reference_envelope(audio: np.ndarray, sr: int,
                             ref_path: str, frame_size: int = 2048,
                             blend: float = 0.7) -> np.ndarray:
    """Match the RMS envelope shape of the reference (first N seconds).

    Computes per-frame RMS ratio (ref/synth) and applies as gain curve.
    blend=0.7 means 70% reference shape + 30% original shape.
    """
    try:
        import librosa
        synth_dur = audio.shape[0] / sr
        y_ref, ref_sr = librosa.load(ref_path, sr=sr, duration=synth_dur)

        hop = frame_size // 4
        rms_ref = librosa.feature.rms(y=y_ref, frame_length=frame_size, hop_length=hop)[0]
        # Mono RMS of synth
        if audio.ndim == 2:
            y_mono = audio.mean(axis=1)
        else:
            y_mono = audio
        rms_syn = librosa.feature.rms(y=y_mono, frame_length=frame_size, hop_length=hop)[0]

        min_frames = min(len(rms_ref), len(rms_syn))
        if min_frames < 10:
            return audio

        rms_ref_n = rms_ref[:min_frames] / (np.max(rms_ref[:min_frames]) + 1e-10)
        rms_syn_n = rms_syn[:min_frames] / (np.max(rms_syn[:min_frames]) + 1e-10)

        # Gain curve: ratio of ref to synth envelope (clamped)
        ratio = (rms_ref_n + 0.01) / (rms_syn_n + 0.01)
        ratio = np.clip(ratio, 0.3, 3.0)

        # Blend: partially apply reference shape
        gain_frames = 1.0 + blend * (ratio - 1.0)

        # Smooth gain curve to avoid artifacts
        from scipy.ndimage import uniform_filter1d
        gain_smooth = uniform_filter1d(gain_frames, size=15)

        # Interpolate to sample level
        frame_times = np.arange(min_frames) * hop / sr
        sample_times = np.arange(audio.shape[0]) / sr
        gain_samples = np.interp(sample_times, frame_times, gain_smooth).astype(np.float32)

        if audio.ndim == 2:
            audio = audio * gain_samples[:, np.newaxis]
        else:
            audio = audio * gain_samples

        # Re-limit peaks after envelope matching
        peak = np.max(np.abs(audio))
        ceiling = 10 ** (-0.3 / 20)
        if peak > ceiling:
            audio = audio * (ceiling / peak)

        corr_before = np.corrcoef(rms_ref_n, rms_syn_n)[0, 1]
        # Recompute after matching
        if audio.ndim == 2:
            y_mono_after = audio.mean(axis=1)
        else:
            y_mono_after = audio
        rms_after = librosa.feature.rms(y=y_mono_after, frame_length=frame_size, hop_length=hop)[0]
        rms_after_n = rms_after[:min_frames] / (np.max(rms_after[:min_frames]) + 1e-10)
        corr_after = np.corrcoef(rms_ref_n, rms_after_n)[0, 1]
        print(f"  [envelope] correlation: {corr_before:.2f} → {corr_after:.2f}")

        return audio
    except ImportError:
        print("  [envelope] librosa not available, skipping")
        return audio


# ---------------------------------------------------------------------------
# Processing pipeline
# ---------------------------------------------------------------------------
def process_stem(audio: np.ndarray, sr: int, chain: Pedalboard) -> np.ndarray:
    """Apply pedalboard chain. Pedalboard expects (channels, samples) float32."""
    # Transpose: soundfile (samples, channels) → pedalboard (channels, samples)
    audio_t = audio.T.astype(np.float32)
    out_t = chain(audio_t, float(sr))
    return out_t.T


def mix_stems(processed: dict,
              levels: Optional[dict] = None) -> np.ndarray:
    """Sum processed stems with dB level adjustment."""
    lvl = levels or DEFAULT_LEVELS
    ref_len = max(a.shape[0] for a in processed.values())

    mixed = np.zeros((ref_len, 2), dtype=np.float32)
    for name, audio in processed.items():
        gain_lin = 10 ** (lvl.get(name, 0.0) / 20.0)
        padded = np.zeros((ref_len, 2), dtype=np.float32)
        padded[:audio.shape[0]] = audio
        mixed += padded * gain_lin

    return mixed


def run_pipeline(args: argparse.Namespace) -> None:
    print(f"Loading stems from {args.stems_dir}...")
    stems = load_stems(args.stems_dir)
    if not stems:
        print("ERROR: No stems found")
        sys.exit(1)

    # Load analysis (optional)
    analysis = None
    if args.analysis and os.path.exists(args.analysis):
        with open(args.analysis) as f:
            analysis = json.load(f)

    adapted = adapt_params_from_analysis(analysis)
    sr = next(iter(stems.values()))[1]

    # Sidechain preset
    sc_preset = SIDECHAIN_PRESETS.get(args.style, SIDECHAIN_PRESETS["hard-techno"])

    # AC-4.2: energy_curve → volume automation for synth/fx
    energy_curve = analysis.get("energy_curve") if analysis else None
    ref_len = max(a.shape[0] for a, _ in stems.values())
    vol_automation = compute_volume_automation(energy_curve, ref_len, sr)

    # Step 1: Per-stem processing
    processed = {}
    for name, (audio, stem_sr) in stems.items():
        builder = CHAIN_BUILDERS.get(name, build_fx_chain)
        chain = builder(**adapted)
        processed[name] = process_stem(audio, stem_sr, chain)
        # Apply volume automation to synth and fx stems
        if vol_automation is not None and name in ("synth", "fx"):
            n = min(processed[name].shape[0], len(vol_automation))
            processed[name][:n] *= vol_automation[:n, np.newaxis]
        print(f"  [{name}] {audio.shape[0]/stem_sr:.1f}s processed")

    # Step 2: Sidechain ducking (T3)
    if not args.no_sidechain and "kick" in processed:
        kick_env = extract_kick_envelope(
            processed["kick"], sr,
            attack_ms=sc_preset["attack_ms"],
            release_ms=sc_preset["release_ms"],
        )
        if np.max(kick_env) > 1e-6:
            if "bass" in processed:
                processed["bass"] = apply_sidechain(
                    processed["bass"], kick_env, depth=sc_preset["depth"])
            if "synth" in processed:
                processed["synth"] = apply_sidechain(
                    processed["synth"], kick_env, depth=sc_preset["depth"] * 0.7)
            print(f"  [sidechain] {args.style}: depth={sc_preset['depth']}")
        else:
            print("  [sidechain] kick silent — skipped")

    # Step 3: Mix
    mixed = mix_stems(processed)
    print(f"  [mix] {mixed.shape[0]/sr:.1f}s mixed")

    # Step 4: Master chain
    master_chain = build_master_chain(**adapted)
    final = process_stem(mixed, sr, master_chain)

    # Step 4b: Reference envelope matching (improves RMS correlation)
    if args.reference and os.path.exists(args.reference):
        final = match_reference_envelope(final, sr, args.reference)

    peak_db = 20 * np.log10(np.max(np.abs(final)) + 1e-10)
    print(f"  [master] peak={peak_db:.1f} dBFS")

    # Write output
    os.makedirs(os.path.dirname(args.output) or ".", exist_ok=True)
    sf.write(args.output, final, sr)
    print(f"Output: {args.output}")

    # Write mix log
    log_path = args.output.replace(".wav", "-mix-log.json")
    log_data = {
        "stems": list(processed.keys()),
        "style": args.style,
        "sidechain": not args.no_sidechain,
        "sidechain_preset": sc_preset if not args.no_sidechain else None,
        "levels": DEFAULT_LEVELS,
        "adapted_params": adapted,
        "peak_dbfs": float(peak_db),
        "sr": sr,
    }
    with open(log_path, "w") as f:
        json.dump(log_data, f, indent=2)

    # Optional: calibrate score
    if args.reference:
        try:
            sys.path.insert(0, os.path.dirname(__file__))
            from calibrate import composite_similarity
            score = composite_similarity(args.reference, args.output)
            print(f"Score: {score['total_score']:.1f}")
        except ImportError:
            print("[score] calibrate.py not available")


def main():
    parser = argparse.ArgumentParser(description="Pro mixing chain")
    parser.add_argument("--stems-dir", required=True, help="Directory with stem WAVs")
    parser.add_argument("--analysis", default=None, help="analysis.json path")
    parser.add_argument("--output", required=True, help="Output master.wav path")
    parser.add_argument("--style", default="hard-techno",
                        choices=list(SIDECHAIN_PRESETS.keys()))
    parser.add_argument("--no-sidechain", action="store_true")
    parser.add_argument("--reference", default=None, help="Reference WAV for scoring")
    args = parser.parse_args()
    run_pipeline(args)


if __name__ == "__main__":
    main()
