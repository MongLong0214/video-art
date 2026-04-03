#!/usr/bin/env python3
"""Technical QC for rendered audio: LUFS, peak, RMS, stereo, clipping."""

import json
import os
import sys

import numpy as np
import soundfile as sf

try:
    import pyloudnorm as pyln
    HAS_PYLOUDNORM = True
except ImportError:
    HAS_PYLOUDNORM = False


TARGET_LUFS_MIN = -16.0
TARGET_LUFS_MAX = -12.0
PEAK_CEILING_DB = -0.3
PEAK_TOLERANCE_DB = 0.02
CLIPPING_THRESHOLD = 0.999
SILENCE_RMS_DB = -60.0


def _to_stereo(y):
    if y.ndim == 1:
        return np.column_stack([y, y])
    if y.shape[1] == 1:
        return np.column_stack([y[:, 0], y[:, 0]])
    if y.shape[1] >= 2:
        return y[:, :2]
    return np.column_stack([y, y])


def _integrated_lufs(y, sr):
    if not HAS_PYLOUDNORM:
        return None
    meter = pyln.Meter(sr)
    try:
        loudness = meter.integrated_loudness(y)
    except Exception:
        return None
    if loudness < -70:
        return None
    return float(loudness)


def _stereo_width(stereo):
    left = stereo[:, 0]
    right = stereo[:, 1]
    mid = (left + right) / 2
    side = (left - right) / 2
    mid_rms = np.sqrt(np.mean(mid ** 2) + 1e-10)
    side_rms = np.sqrt(np.mean(side ** 2) + 1e-10)
    return float(min(side_rms / max(mid_rms, 1e-10), 1.0))


def _frequency_flags(y, sr):
    mono = np.mean(y, axis=1) if y.ndim > 1 else y
    spectrum = np.abs(np.fft.rfft(mono)) ** 2
    freqs = np.fft.rfftfreq(len(mono), 1 / sr)
    total = float(np.sum(spectrum) + 1e-10)
    low = float(np.sum(spectrum[freqs < 80]) / total)
    high = float(np.sum(spectrum[freqs > 9000]) / total)
    warnings = []
    if low > 0.45:
        warnings.append("Excessive low-end energy below 80Hz")
    if high > 0.35:
        warnings.append("Harsh high-frequency energy above 9kHz")
    return warnings


def analyze_technical_qc(wav_path):
    y, sr = sf.read(wav_path)
    stereo = _to_stereo(y)
    peak = float(np.max(np.abs(stereo)))
    peak_dbfs = float(20 * np.log10(peak + 1e-10))
    rms = float(np.sqrt(np.mean(stereo ** 2) + 1e-10))
    rms_dbfs = float(20 * np.log10(rms + 1e-10))
    clipping_count = int(np.sum(np.abs(stereo) >= CLIPPING_THRESHOLD))
    lufs = _integrated_lufs(stereo, sr)
    stereo_width = _stereo_width(stereo)

    warnings = []
    if lufs is not None and (lufs < TARGET_LUFS_MIN or lufs > TARGET_LUFS_MAX):
        warnings.append(f"LUFS {lufs:.1f} outside target range [{TARGET_LUFS_MIN:.0f}, {TARGET_LUFS_MAX:.0f}]")
    if peak_dbfs > (PEAK_CEILING_DB + PEAK_TOLERANCE_DB):
        warnings.append(f"Peak {peak_dbfs:.2f} dBFS exceeds ceiling {PEAK_CEILING_DB:.1f} dBFS")
    if clipping_count > 0:
        warnings.append(f"Detected {clipping_count} clipped samples")
    if rms_dbfs < SILENCE_RMS_DB:
        warnings.append(f"Signal is effectively silent ({rms_dbfs:.1f} dBFS RMS)")
    warnings.extend(_frequency_flags(stereo, sr))

    return {
        "wav_path": os.path.realpath(wav_path),
        "sample_rate": int(sr),
        "channels": int(stereo.shape[1]),
        "duration_sec": round(float(len(stereo) / sr), 3),
        "lufs_integrated": None if lufs is None else round(lufs, 2),
        "peak_dbfs": round(peak_dbfs, 2),
        "rms_dbfs": round(rms_dbfs, 2),
        "stereo_width": round(stereo_width, 3),
        "clipping_count": clipping_count,
        "passed": (
            clipping_count == 0
            and peak_dbfs <= (PEAK_CEILING_DB + PEAK_TOLERANCE_DB)
            and rms_dbfs >= SILENCE_RMS_DB
            and (lufs is None or (TARGET_LUFS_MIN <= lufs <= TARGET_LUFS_MAX))
        ),
        "warnings": warnings,
    }


def write_qc_json(wav_path, out_path):
    result = analyze_technical_qc(wav_path)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)
    return result


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(f"Usage: python3 {sys.argv[0]} <input.wav> [output.json]", file=sys.stderr)
        sys.exit(1)

    wav_path = sys.argv[1]
    out_path = sys.argv[2] if len(sys.argv) > 2 else wav_path.replace(".wav", "-technical-qc.json")

    if not os.path.exists(wav_path):
        print(f"Error: file not found: {wav_path}", file=sys.stderr)
        sys.exit(1)

    result = write_qc_json(wav_path, out_path)
    print(f"Technical QC saved: {out_path}")
    print(f"  LUFS: {result['lufs_integrated']}")
    print(f"  Peak: {result['peak_dbfs']}")
    print(f"  RMS: {result['rms_dbfs']}")
    print(f"  Passed: {result['passed']}")
