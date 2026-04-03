#!/usr/bin/env python3
"""Acid Reinterpreter — Step 5: Mixing & Mastering."""

import argparse
import json
import os
import sys

import numpy as np
import soundfile as sf

try:
    import pedalboard
    from pedalboard import (
        Compressor, Delay, HighpassFilter, Limiter, LowShelfFilter, Reverb,
    )
    from pedalboard.io import AudioFile
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
    """Load a rendered stem. Returns (2, samples) or None."""
    if not os.path.exists(path):
        return None
    data, sr = sf.read(path)
    if data.ndim == 1:
        data = np.stack([data, data])
    elif data.ndim == 2:
        data = data.T
    return data.astype(np.float32)


def mix_stems(bass: np.ndarray | None, riff: np.ndarray | None, drums: np.ndarray | None, pad: np.ndarray | None = None, sub: np.ndarray | None = None, arp: np.ndarray | None = None) -> np.ndarray:
    """Mix stems with level balancing and per-stem EQ."""
    if not HAS_PEDALBOARD:
        # fallback: simple sum
        stems_raw = [s for s in [drums, bass, riff, pad, sub] if s is not None]
        if not stems_raw:
            raise ValueError("No stems to mix")
        max_len = max(s.shape[1] for s in stems_raw)
        mixed = np.zeros((2, max_len), dtype=np.float32)
        for s in stems_raw:
            mixed[:, :s.shape[1]] += s
        return mixed

    from pedalboard import HighpassFilter, LowpassFilter, LowShelfFilter, PeakFilter

    stems = []
    if drums is not None:
        # Drums: foundation, behind 303s
        board = pedalboard.Pedalboard([
            HighpassFilter(cutoff_frequency_hz=30),
            LowpassFilter(cutoff_frequency_hz=9000),
        ])
        stems.append(("drums", board(drums, SR), -2.5))
    if sub is not None:
        # Sub (MIDI 27, ~55Hz): pure sub, steep LPF
        board = pedalboard.Pedalboard([
            HighpassFilter(cutoff_frequency_hz=20),
            LowpassFilter(cutoff_frequency_hz=120),
        ])
        stems.append(("sub", board(sub, SR), -2.0))
    if bass is not None:
        # Bass: 303 filter sweep zone
        board = pedalboard.Pedalboard([
            HighpassFilter(cutoff_frequency_hz=45),
            LowpassFilter(cutoff_frequency_hz=1200),
            PeakFilter(cutoff_frequency_hz=200, gain_db=1.5, q=0.8),   # 303 body
        ])
        stems.append(("bass", board(bass, SR), -1.0))
    if pad is not None:
        # Pad (MIDI 39-42, ~104-110Hz): low-mid warmth
        board = pedalboard.Pedalboard([
            HighpassFilter(cutoff_frequency_hz=70),
            LowpassFilter(cutoff_frequency_hz=1500),
        ])
        stems.append(("pad", board(pad, SR), -9.0))
    if riff is not None:
        # Riff: 303 acid character — let filter sweep through
        board = pedalboard.Pedalboard([
            HighpassFilter(cutoff_frequency_hz=100),
            PeakFilter(cutoff_frequency_hz=1000, gain_db=2.5, q=0.5),  # 303 filter sweep zone
            PeakFilter(cutoff_frequency_hz=3000, gain_db=1.5, q=0.6),  # bite
        ])
        stems.append(("riff", board(riff, SR), -3.0))
    if arp is not None:
        # Arp: trance shimmer, above riff
        board = pedalboard.Pedalboard([
            HighpassFilter(cutoff_frequency_hz=180),
            PeakFilter(cutoff_frequency_hz=2000, gain_db=1.5, q=0.5),
            PeakFilter(cutoff_frequency_hz=7000, gain_db=2.0, q=0.4),  # shimmer
        ])
        stems.append(("arp", board(arp, SR), -5.5))

    if not stems:
        raise ValueError("No stems to mix")

    max_len = max(s[1].shape[1] for s in stems)
    mixed = np.zeros((2, max_len), dtype=np.float32)

    for name, audio, db in stems:
        gain = 10 ** (db / 20)
        padded = np.zeros((2, max_len), dtype=np.float32)
        padded[:, :audio.shape[1]] = audio
        mixed += padded * gain

    return mixed


def apply_fx(audio: np.ndarray, fx_params: dict) -> np.ndarray:
    """Parallel FX: reverb + delay as send buses, blended with dry."""
    if not HAS_PEDALBOARD:
        return audio

    reverb_send = fx_params.get("reverb_send", 0.3)
    delay_send = fx_params.get("delay_send", 0.2)
    delay_time = fx_params.get("delay_time", 0.375)

    dry = audio.copy()
    wet = np.zeros_like(audio)

    # Reverb bus — big hall, bright tail for trance
    if reverb_send > 0:
        from pedalboard import LowpassFilter
        rv_board = pedalboard.Pedalboard([
            Reverb(room_size=0.75, damping=0.4, wet_level=1.0, dry_level=0.0, width=1.0),
            LowpassFilter(cutoff_frequency_hz=8000),
        ])
        wet += rv_board(audio, SR) * reverb_send

    # Delay bus — synced, high feedback for trance echo
    if delay_send > 0:
        from pedalboard import HighpassFilter as HPF, LowpassFilter as LPF2
        dl_board = pedalboard.Pedalboard([
            Delay(delay_seconds=delay_time, feedback=0.45, mix=1.0),
            LPF2(cutoff_frequency_hz=6000),
            HPF(cutoff_frequency_hz=150),
        ])
        wet += dl_board(audio, SR) * delay_send

    return dry + wet


def master_chain(audio: np.ndarray) -> np.ndarray:
    """Mastering: surgical EQ → glue comp → saturation → limiter."""
    if not HAS_PEDALBOARD:
        return audio

    from pedalboard import PeakFilter, Clipping

    board = pedalboard.Pedalboard([
        # Clean up
        HighpassFilter(cutoff_frequency_hz=25),
        # Sub weight
        LowShelfFilter(cutoff_frequency_hz=60, gain_db=1.0),
        # Mud cut
        PeakFilter(cutoff_frequency_hz=300, gain_db=-1.5, q=1.2),
        # 303 bite
        PeakFilter(cutoff_frequency_hz=1500, gain_db=1.0, q=0.6),
        # Trance air
        PeakFilter(cutoff_frequency_hz=8000, gain_db=1.5, q=0.5),
        PeakFilter(cutoff_frequency_hz=12000, gain_db=1.0, q=0.4),
        # Gentle glue
        Compressor(threshold_db=-12, ratio=2, attack_ms=20, release_ms=150),
        # Soft clip
        Clipping(threshold_db=-2.0),
        # Limiter
        Limiter(threshold_db=-0.5),
    ])
    return board(audio, SR)


def normalize_loudness(audio: np.ndarray) -> np.ndarray:
    """LUFS normalization to target."""
    if not HAS_PYLOUDNORM:
        return audio

    # pyloudnorm expects (samples, channels)
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
    """Quality control checks."""
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
        "lufs": round(lufs, 2),
        "peak_dbfs": round(peak_dbfs, 2),
        "clipping_count": clipping,
        "stereo_width": round(stereo_width, 4),
        "duration": round(duration, 3),
        "passed": passed,
        "warnings": warnings,
    }


def main():
    parser = argparse.ArgumentParser(description="Acid Reinterpreter — Mastering")
    parser.add_argument("--bass", help="Path to bass_303.wav")
    parser.add_argument("--riff", help="Path to riff_303.wav")
    parser.add_argument("--pad", help="Path to pad_303.wav")
    parser.add_argument("--sub", help="Path to sub_303.wav")
    parser.add_argument("--arp", help="Path to arp_303.wav")
    parser.add_argument("--drums", required=True, help="Path to drums_909.wav")
    parser.add_argument("--interpretation", required=True, help="Path to interpretation.json")
    parser.add_argument("--out", required=True, help="Output master.wav path")
    parser.add_argument("--qc-out", help="Output qc.json path")
    args = parser.parse_args()

    with open(args.interpretation) as f:
        interpretation = json.load(f)

    print("Loading stems...")
    bass = load_stem(args.bass) if args.bass else None
    riff = load_stem(args.riff) if args.riff else None
    pad = load_stem(args.pad) if args.pad else None
    sub = load_stem(args.sub) if args.sub else None
    arp = load_stem(args.arp) if args.arp else None
    drums = load_stem(args.drums)

    print("Mixing...")
    mixed = mix_stems(bass, riff, drums, pad, sub, arp)

    print("Applying FX...")
    mixed = apply_fx(mixed, interpretation.get("fx", {}))

    print("Mastering...")
    mastered = master_chain(mixed)

    print("Normalizing loudness...")
    mastered = normalize_loudness(mastered)

    # Write output
    sf.write(args.out, mastered.T, SR, subtype="PCM_16")
    print(f"Master saved: {args.out}")

    # QC
    qc = qc_check(mastered)
    print(f"QC: LUFS={qc['lufs']}, peak={qc['peak_dbfs']}dBFS, clip={qc['clipping_count']}, passed={qc['passed']}")

    if args.qc_out:
        with open(args.qc_out, "w") as f:
            json.dump(qc, f, indent=2)
        print(f"QC saved: {args.qc_out}")

    if not qc["passed"]:
        print(f"WARNING: QC failed — {qc['warnings']}", file=sys.stderr)


if __name__ == "__main__":
    main()
