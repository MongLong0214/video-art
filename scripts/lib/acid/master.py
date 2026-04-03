#!/usr/bin/env python3
"""Acid Reinterpreter — Step 5: Pro Mixing & Mastering."""

import argparse
import json
import os
import sys

import numpy as np
import soundfile as sf

try:
    import pedalboard
    from pedalboard import (
        Chorus, Clipping, Compressor, Delay, Distortion, Gain,
        HighpassFilter, HighShelfFilter, Limiter, LowpassFilter,
        LowShelfFilter, PeakFilter, Reverb,
    )
    HAS_PEDALBOARD = True
except ImportError:
    HAS_PEDALBOARD = False

try:
    import pyloudnorm as pyln
    HAS_PYLOUDNORM = True
except ImportError:
    HAS_PYLOUDNORM = False

SR = 44100
TARGET_LUFS = -14.0


def load_stem(path: str) -> np.ndarray | None:
    if not os.path.exists(path):
        return None
    data, sr = sf.read(path)
    if data.ndim == 1:
        data = np.stack([data, data])
    elif data.ndim == 2:
        data = data.T
    return data.astype(np.float32)


def mono_below(audio: np.ndarray, freq_hz: float) -> np.ndarray:
    """Sum L+R below freq for tight low end, keep stereo above."""
    from scipy.signal import butter, sosfilt
    sos_lp = butter(4, freq_hz, btype='low', fs=SR, output='sos')
    sos_hp = butter(4, freq_hz, btype='high', fs=SR, output='sos')
    low_l = sosfilt(sos_lp, audio[0])
    low_r = sosfilt(sos_lp, audio[1])
    low_mono = (low_l + low_r) * 0.5
    high_l = sosfilt(sos_hp, audio[0])
    high_r = sosfilt(sos_hp, audio[1])
    return np.stack([low_mono + high_l, low_mono + high_r]).astype(np.float32)


def stereo_widen(audio: np.ndarray, amount: float = 0.3) -> np.ndarray:
    """Haas-style stereo widening."""
    mid = (audio[0] + audio[1]) * 0.5
    side = (audio[0] - audio[1]) * 0.5
    side *= (1.0 + amount)
    return np.stack([mid + side, mid - side]).astype(np.float32)


def process_stem(audio: np.ndarray, chain: list, gain_db: float) -> np.ndarray:
    if HAS_PEDALBOARD and chain:
        board = pedalboard.Pedalboard(chain)
        audio = board(audio, SR)
    gain = 10 ** (gain_db / 20)
    return audio * gain


def mix_stems(drums, bass, riff, pad, sub, arp, stab=None) -> np.ndarray:
    stems = []

    if drums is not None:
        processed = process_stem(drums, [
            HighpassFilter(cutoff_frequency_hz=28),
            LowpassFilter(cutoff_frequency_hz=10000),
            # Kick thump
            PeakFilter(cutoff_frequency_hz=60, gain_db=2.0, q=1.5),
            # Transient snap
            PeakFilter(cutoff_frequency_hz=3500, gain_db=1.0, q=0.8),
            # Tame harsh hats
            PeakFilter(cutoff_frequency_hz=7000, gain_db=-1.0, q=0.6),
            # Drum bus comp
            Compressor(threshold_db=-12, ratio=3, attack_ms=5, release_ms=40),
        ], gain_db=-2.0)
        stems.append(processed)

    if sub is not None:
        processed = process_stem(sub, [
            HighpassFilter(cutoff_frequency_hz=20),
            LowpassFilter(cutoff_frequency_hz=100),
        ], gain_db=-2.0)
        stems.append(processed)

    if bass is not None:
        processed = process_stem(bass, [
            HighpassFilter(cutoff_frequency_hz=50),
            LowpassFilter(cutoff_frequency_hz=1500),
            # 303 body
            PeakFilter(cutoff_frequency_hz=180, gain_db=2.0, q=0.7),
            # Filter sweep presence
            PeakFilter(cutoff_frequency_hz=600, gain_db=1.0, q=0.5),
            # Warm saturation
            Distortion(drive_db=3.0),
            Compressor(threshold_db=-15, ratio=3, attack_ms=8, release_ms=60),
        ], gain_db=-1.0)
        stems.append(processed)

    if pad is not None:
        processed = process_stem(pad, [
            HighpassFilter(cutoff_frequency_hz=80),
            LowpassFilter(cutoff_frequency_hz=1200),
            # Soft and wide
            Chorus(rate_hz=0.3, depth=0.15, mix=0.3),
        ], gain_db=-10.0)
        stems.append(stereo_widen(processed, 0.4))

    if riff is not None:
        processed = process_stem(riff, [
            HighpassFilter(cutoff_frequency_hz=90),
            # 303 filter sweep — this is where the magic lives
            PeakFilter(cutoff_frequency_hz=800, gain_db=3.0, q=0.4),
            PeakFilter(cutoff_frequency_hz=2000, gain_db=2.0, q=0.5),
            # Bite
            PeakFilter(cutoff_frequency_hz=4000, gain_db=1.5, q=0.6),
            # Warm drive
            Distortion(drive_db=4.0),
            Compressor(threshold_db=-12, ratio=2.5, attack_ms=5, release_ms=50),
        ], gain_db=-2.5)
        stems.append(processed)

    if arp is not None:
        processed = process_stem(arp, [
            HighpassFilter(cutoff_frequency_hz=200),
            PeakFilter(cutoff_frequency_hz=1500, gain_db=1.5, q=0.5),
            PeakFilter(cutoff_frequency_hz=5000, gain_db=2.0, q=0.4),
            PeakFilter(cutoff_frequency_hz=9000, gain_db=1.5, q=0.3),
            Compressor(threshold_db=-15, ratio=2, attack_ms=10, release_ms=80),
        ], gain_db=-5.0)
        stems.append(stereo_widen(processed, 0.3))

    if not stems:
        raise ValueError("No stems to mix")

    max_len = max(s.shape[1] for s in stems)
    mixed = np.zeros((2, max_len), dtype=np.float32)
    for s in stems:
        mixed[:, :s.shape[1]] += s

    return mixed


def apply_fx(audio: np.ndarray, fx_params: dict) -> np.ndarray:
    if not HAS_PEDALBOARD:
        return audio

    reverb_send = fx_params.get("reverb_send", 0.3)
    delay_send = fx_params.get("delay_send", 0.2)
    delay_time = fx_params.get("delay_time", 0.375)

    dry = audio.copy()
    wet = np.zeros_like(audio)

    # Reverb: dark room, low-passed, for depth
    if reverb_send > 0:
        rv = pedalboard.Pedalboard([
            HighpassFilter(cutoff_frequency_hz=200),
            Reverb(room_size=0.65, damping=0.5, wet_level=1.0, dry_level=0.0, width=1.0),
            LowpassFilter(cutoff_frequency_hz=6000),
        ])
        wet += rv(audio, SR) * reverb_send

    # Delay: filtered, synced, trance echo
    if delay_send > 0:
        dl = pedalboard.Pedalboard([
            HighpassFilter(cutoff_frequency_hz=200),
            Delay(delay_seconds=delay_time, feedback=0.4, mix=1.0),
            LowpassFilter(cutoff_frequency_hz=4000),
        ])
        wet += dl(audio, SR) * delay_send

    return dry + wet


def master_chain(audio: np.ndarray) -> np.ndarray:
    if not HAS_PEDALBOARD:
        return audio

    # Stage 1: Surgical EQ
    eq = pedalboard.Pedalboard([
        HighpassFilter(cutoff_frequency_hz=25),
        # Sub foundation
        LowShelfFilter(cutoff_frequency_hz=55, gain_db=1.5),
        # Clear mud
        PeakFilter(cutoff_frequency_hz=250, gain_db=-2.0, q=1.5),
        # 303 presence
        PeakFilter(cutoff_frequency_hz=1200, gain_db=1.5, q=0.5),
        # Definition
        PeakFilter(cutoff_frequency_hz=3500, gain_db=1.0, q=0.6),
        # Air
        HighShelfFilter(cutoff_frequency_hz=8000, gain_db=2.0),
    ])
    audio = eq(audio, SR)

    # Stage 2: Glue compression
    glue = pedalboard.Pedalboard([
        Compressor(threshold_db=-8, ratio=2.5, attack_ms=15, release_ms=100),
    ])
    audio = glue(audio, SR)

    # Stage 3: Warmth — gentle saturation
    warmth = pedalboard.Pedalboard([
        Clipping(threshold_db=-3.0),
    ])
    audio = warmth(audio, SR)

    # Stage 4: Final limiter
    limit = pedalboard.Pedalboard([
        Limiter(threshold_db=-0.5),
    ])
    audio = limit(audio, SR)

    return audio


def normalize_loudness(audio: np.ndarray) -> np.ndarray:
    if not HAS_PYLOUDNORM:
        return audio
    audio_t = audio.T
    meter = pyln.Meter(SR)
    lufs = meter.integrated_loudness(audio_t)
    if np.isinf(lufs) or np.isnan(lufs):
        return audio
    normalized = pyln.normalize.loudness(audio_t, lufs, TARGET_LUFS)
    peak = np.abs(normalized).max()
    if peak > 0.98:
        normalized = normalized * (0.95 / peak)
    return normalized.T


def qc_check(audio: np.ndarray) -> dict:
    audio_t = audio.T
    peak = float(np.abs(audio).max())
    peak_dbfs = 20 * np.log10(peak + 1e-10)
    clipping = int(np.sum(np.abs(audio) >= 0.999))
    duration = audio.shape[1] / SR
    stereo_width = float(np.std(audio[0] - audio[1])) if audio.shape[0] == 2 else 0.0
    lufs = -99.0
    if HAS_PYLOUDNORM:
        meter = pyln.Meter(SR)
        lufs = float(meter.integrated_loudness(audio_t))
    warnings = []
    passed = True
    if lufs < -16 or lufs > -12:
        warnings.append(f"LUFS {lufs:.1f} outside target range [-16, -12]")
        passed = False
    if peak_dbfs > -0.3:
        warnings.append(f"Peak {peak_dbfs:.1f} dBFS exceeds -0.3")
        passed = False
    if clipping > 0:
        warnings.append(f"Clipping detected: {clipping} samples")
        passed = False
    return {
        "lufs": round(lufs, 2), "peak_dbfs": round(peak_dbfs, 2),
        "clipping_count": clipping, "stereo_width": round(stereo_width, 4),
        "duration": round(duration, 3), "passed": passed, "warnings": warnings,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--bass", help="bass_303.wav")
    parser.add_argument("--riff", help="riff_303.wav")
    parser.add_argument("--pad", help="pad_303.wav")
    parser.add_argument("--sub", help="sub_303.wav")
    parser.add_argument("--arp", help="arp_303.wav")
    parser.add_argument("--stab", help="stab_303.wav")
    parser.add_argument("--drums", required=True)
    parser.add_argument("--interpretation", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--qc-out")
    args = parser.parse_args()

    with open(args.interpretation) as f:
        interpretation = json.load(f)

    print("Loading stems...")
    bass = load_stem(args.bass) if args.bass else None
    riff = load_stem(args.riff) if args.riff else None
    pad = load_stem(args.pad) if args.pad else None
    sub = load_stem(args.sub) if args.sub else None
    arp = load_stem(args.arp) if args.arp else None
    stab = load_stem(args.stab) if args.stab else None
    drums = load_stem(args.drums)

    print("Mixing...")
    mixed = mix_stems(drums, bass, riff, pad, sub, arp, stab)

    # Mono below 120Hz
    try:
        mixed = mono_below(mixed, 120)
        print("  Mono below 120Hz applied")
    except ImportError:
        pass

    print("Applying FX...")
    mixed = apply_fx(mixed, interpretation.get("fx", {}))

    print("Mastering...")
    mastered = master_chain(mixed)

    print("Normalizing loudness...")
    mastered = normalize_loudness(mastered)

    sf.write(args.out, mastered.T, SR, subtype="PCM_16")
    print(f"Master saved: {args.out}")

    qc = qc_check(mastered)
    print(f"QC: LUFS={qc['lufs']}, peak={qc['peak_dbfs']}dBFS, clip={qc['clipping_count']}, width={qc['stereo_width']:.3f}")

    if args.qc_out:
        with open(args.qc_out, "w") as f:
            json.dump(qc, f, indent=2)

    if not qc["passed"]:
        print(f"WARNING: {qc['warnings']}", file=sys.stderr)


if __name__ == "__main__":
    main()
