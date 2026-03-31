#!/usr/bin/env python3
"""T17: Python mastering chain — 3-band EQ + multiband comp + LUFS limiter.

Spectral balance correction for synthesis output.
Usage: python3 master.py <input.wav> <analysis.json> [--reference ref.wav] [--no-score]
"""

import sys
import os
import json
import shutil
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt

try:
    import pyloudnorm as pyln
    HAS_PYLOUDNORM = True
except ImportError:
    HAS_PYLOUDNORM = False

# Crossover frequencies (AC-1)
CROSSOVER_LOW = 250   # Hz
CROSSOVER_HIGH = 4000  # Hz

# Target (AC-4)
TARGET_LUFS = -14.0

# Peak ceiling (AC-7)
PEAK_CEILING_DB = -0.3


def compute_eq_gains(frequency_balance):
    """AC-2/3: Dynamic EQ gains from frequency_balance analysis.

    gain = 10*log10(target/current). Clamped: mid max +8dB, high max +6dB.
    Fallback: mid +6dB, high +4dB when balance is None.
    """
    if frequency_balance is None:
        return {"low": 0.0, "mid": 6.0, "hi": 4.0}

    low = frequency_balance.get("low", 0.33)
    mid = frequency_balance.get("mid", 0.33)
    hi = frequency_balance.get("hi", 0.33)

    # Target: roughly equal energy distribution (1/3 each)
    target = 1.0 / 3.0

    def safe_gain(current, target_val, max_db):
        if current < 1e-6:
            return max_db
        ratio = target_val / current
        gain = 10 * np.log10(max(ratio, 1e-6))
        return float(np.clip(gain, -6.0, max_db))

    return {
        "low": safe_gain(low, target, 4.0),
        "mid": safe_gain(mid, target, 8.0),
        "hi": safe_gain(hi, target, 6.0),
    }


def _crossover_filter(y, sr, low_freq, high_freq):
    """3-band Butterworth crossover split."""
    nyq = sr / 2.0
    # Guard against invalid frequencies
    low_freq = min(low_freq, nyq * 0.9)
    high_freq = min(high_freq, nyq * 0.9)

    sos_lp = butter(4, low_freq / nyq, btype='low', output='sos')
    sos_bp = butter(4, [low_freq / nyq, high_freq / nyq], btype='band', output='sos')
    sos_hp = butter(4, high_freq / nyq, btype='high', output='sos')

    return sosfilt(sos_lp, y), sosfilt(sos_bp, y), sosfilt(sos_hp, y)


def _apply_gains(low, mid, hi, gains):
    """Apply dB gains to each band."""
    low_lin = 10 ** (gains["low"] / 20.0)
    mid_lin = 10 ** (gains["mid"] / 20.0)
    hi_lin = 10 ** (gains["hi"] / 20.0)
    return low * low_lin + mid * mid_lin + hi * hi_lin


def _multiband_compress(low, mid, hi, threshold=-20, ratio=3.0,
                        attack_ms=5.0, release_ms=50.0, sr=22050):
    """Per-band RMS envelope compression with attack/release smoothing."""
    def compress_band(band, threshold_db, ratio):
        frame_size = 512
        hop = frame_size // 2  # 50% overlap
        attack_coeff = np.exp(-1.0 / (attack_ms * sr / 1000))
        release_coeff = np.exp(-1.0 / (release_ms * sr / 1000))

        # Compute per-frame gain curve
        n_frames = max(1, (len(band) - frame_size) // hop + 1)
        frame_gains = np.ones(n_frames)

        for i in range(n_frames):
            start = i * hop
            end = min(start + frame_size, len(band))
            frame = band[start:end]
            rms = np.sqrt(np.mean(frame ** 2) + 1e-10)
            rms_db = 20 * np.log10(rms + 1e-10)
            if rms_db > threshold_db:
                gain_reduction = (rms_db - threshold_db) * (1 - 1 / ratio)
                frame_gains[i] = 10 ** (-gain_reduction / 20.0)

        # Smooth gain envelope (attack/release)
        smoothed = np.ones(n_frames)
        smoothed[0] = frame_gains[0]
        for i in range(1, n_frames):
            coeff = attack_coeff if frame_gains[i] < smoothed[i - 1] else release_coeff
            smoothed[i] = coeff * smoothed[i - 1] + (1 - coeff) * frame_gains[i]

        # Interpolate gain to sample-level and apply
        sample_indices = np.arange(len(band))
        frame_centers = np.arange(n_frames) * hop + frame_size // 2
        frame_centers = np.clip(frame_centers, 0, len(band) - 1)
        gain_curve = np.interp(sample_indices, frame_centers, smoothed)

        return band * gain_curve

    return (
        compress_band(low, threshold, ratio),
        compress_band(mid, threshold - 3, ratio),
        compress_band(hi, threshold - 6, ratio),
    )


def _lufs_normalize(y, sr, target_lufs=TARGET_LUFS):
    """AC-4: LUFS normalization to target."""
    if not HAS_PYLOUDNORM:
        # Fallback: simple peak normalization
        peak = np.max(np.abs(y)) + 1e-10
        target_peak = 10 ** (target_lufs / 20.0)
        return y * (target_peak / peak)

    meter = pyln.Meter(sr)
    current_lufs = meter.integrated_loudness(y)
    if current_lufs < -70:
        return y  # silence bypass
    return pyln.normalize.loudness(y, current_lufs, target_lufs)


def _peak_limit(y, ceiling_db=PEAK_CEILING_DB):
    """AC-7: Hard limiter — ensure peak <= ceiling."""
    ceiling_lin = 10 ** (ceiling_db / 20.0)
    peak = np.max(np.abs(y))
    if peak > ceiling_lin:
        y = y * (ceiling_lin / peak)
    return y


def non_regression_gate(before_score, after_score, threshold=3.0):
    """AC-7: Reject mastered if score drops by more than threshold."""
    delta = after_score - before_score
    if delta < -threshold:
        return {"action": "reject", "delta": float(delta)}
    return {"action": "accept", "delta": float(delta)}


def measure_frequency_balance(y_mono, sr):
    """Measure actual frequency balance of audio using 3-band crossover."""
    low, mid, hi = _crossover_filter(y_mono, sr, CROSSOVER_LOW, CROSSOVER_HIGH)
    rms_low = np.sqrt(np.mean(low ** 2) + 1e-10)
    rms_mid = np.sqrt(np.mean(mid ** 2) + 1e-10)
    rms_hi = np.sqrt(np.mean(hi ** 2) + 1e-10)
    total = rms_low + rms_mid + rms_hi
    return {
        "low": float(rms_low / total),
        "mid": float(rms_mid / total),
        "hi": float(rms_hi / total),
    }


def master_audio(input_path, analysis_json_path, output_path=None):
    """Full mastering chain: 3-band EQ → multiband comp → LUFS → peak limit.

    Returns output path.
    """
    y, sr = sf.read(input_path)

    # Downmix to stereo if multi-channel (SC NRT renders N-channel stem buses)
    if y.ndim > 1 and y.shape[1] > 2:
        n_ch = y.shape[1]
        left = np.zeros(y.shape[0])
        right = np.zeros(y.shape[0])
        for i in range(0, n_ch - 1, 2):
            left += y[:, i]
            right += y[:, i + 1]
        if n_ch % 2 == 1:
            left += y[:, -1] * 0.5
            right += y[:, -1] * 0.5
        y = np.column_stack([left, right])

    is_stereo = y.ndim > 1 and y.shape[1] >= 2
    if is_stereo:
        channels = [y[:, ch] for ch in range(y.shape[1])]
    else:
        channels = [y.flatten()]

    # Silence bypass
    rms = np.sqrt(np.mean(channels[0] ** 2))
    if rms < 1e-6:
        out_path = output_path or input_path.replace(".wav", "-mastered.wav")
        sf.write(out_path, y, sr)
        return out_path

    # Measure actual frequency balance of synthesis output (not from analysis.json)
    mono_for_measure = np.mean(y, axis=1) if is_stereo else channels[0]
    freq_balance = measure_frequency_balance(mono_for_measure, sr)

    # EQ gains from measured balance
    gains = compute_eq_gains(freq_balance)

    # Process each channel independently
    processed_channels = []
    for ch in channels:
        low, mid, hi = _crossover_filter(ch, sr, CROSSOVER_LOW, CROSSOVER_HIGH)
        ch_eq = _apply_gains(low, mid, hi, gains)
        low2, mid2, hi2 = _crossover_filter(ch_eq, sr, CROSSOVER_LOW, CROSSOVER_HIGH)
        low_c, mid_c, hi_c = _multiband_compress(low2, mid2, hi2)
        processed_channels.append(low_c + mid_c + hi_c)

    # Recombine channels for LUFS + peak limiting
    if is_stereo:
        y_comp = np.column_stack(processed_channels)
    else:
        y_comp = processed_channels[0]

    # LUFS normalization (AC-4)
    y_norm = _lufs_normalize(y_comp, sr)

    # LUFS range validation (-16 to -12) — max 1 re-normalization attempt
    if HAS_PYLOUDNORM:
        meter = pyln.Meter(sr)
        actual_lufs = meter.integrated_loudness(y_norm)
        if actual_lufs > -70:  # not silence
            if actual_lufs < -16 or actual_lufs > -12:
                print(f"WARNING: LUFS {actual_lufs:.1f} out of [-16, -12], re-normalizing to -14")
                y_norm = _lufs_normalize(y_norm, sr, target_lufs=-14.0)
                # Verify after re-normalization (no further retry)
                final_lufs = meter.integrated_loudness(y_norm)
                if final_lufs < -16 or final_lufs > -12:
                    print(f"WARNING: LUFS still {final_lufs:.1f} after re-normalization")

    # Peak limiter (AC-7)
    y_final = _peak_limit(y_norm)

    # Write output
    out_path = output_path or input_path.replace(".wav", "-mastered.wav")
    sf.write(out_path, y_final.astype(np.float32), sr)
    return out_path


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 master.py <input.wav> <analysis.json> [--reference ref.wav]")
        sys.exit(1)

    input_wav = sys.argv[1]
    analysis_json = sys.argv[2]
    ref_wav = None
    if "--reference" in sys.argv:
        idx = sys.argv.index("--reference")
        ref_wav = sys.argv[idx + 1]

    out = master_audio(input_wav, analysis_json)
    print(f"Mastered: {out}")

    # Optional: run calibrate for before/after score
    if ref_wav and "--no-score" not in sys.argv:
        try:
            from calibrate import composite_similarity
            before = composite_similarity(ref_wav, input_wav)
            after = composite_similarity(ref_wav, out)
            gate = non_regression_gate(before["total_score"], after["total_score"])
            print(f"Score: {before['total_score']:.1f} → {after['total_score']:.1f} ({gate['action']})")
            if gate["action"] == "reject":
                print("WARNING: Mastering worsened score. Keeping original.")
                shutil.copy2(input_wav, out)
        except ImportError:
            print("calibrate.py not available for scoring")
