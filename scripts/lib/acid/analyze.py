#!/usr/bin/env python3
"""Acid Reinterpreter — Step 2: Multi-stem audio analyzer.

Usage:
    python analyze.py --drums stems/drums.wav --bass stems/bass.wav \
        --other stems/other.wav --mix input.wav --out analysis.json \
        [--range-start 0] [--range-end 20]
"""

import argparse
import json
import sys
import warnings as _warnings

import numpy as np
import librosa
import soundfile as sf

_warnings.filterwarnings("ignore", category=FutureWarning)
_warnings.filterwarnings("ignore", category=UserWarning)

# Optional imports
try:
    from basic_pitch.inference import predict as bp_predict
    HAS_BASIC_PITCH = True
except ImportError:
    HAS_BASIC_PITCH = False

try:
    import madmom
    HAS_MADMOM = True
except ImportError:
    HAS_MADMOM = False

try:
    import essentia.standard as es
    HAS_ESSENTIA = True
except ImportError:
    HAS_ESSENTIA = False


def rms_db(audio: np.ndarray) -> float:
    rms = np.sqrt(np.mean(audio ** 2))
    return 20 * np.log10(rms + 1e-10)


def detect_bpm(mix: np.ndarray, sr: int) -> dict:
    """BPM detection with librosa + optional essentia ensemble."""
    tempo_lib, _ = librosa.beat.beat_track(y=mix, sr=sr)
    tempo_lib = float(np.atleast_1d(tempo_lib)[0])
    confidence = 0.8

    if HAS_ESSENTIA:
        rhythm = es.RhythmExtractor2013(method="multifeature")
        bpm_ess, _, _, _, _ = rhythm(mix.astype(np.float32))
        bpm_ess = float(bpm_ess)
        if abs(tempo_lib - bpm_ess) <= 2:
            confidence = 0.95
            tempo_lib = (tempo_lib + bpm_ess) / 2
        else:
            confidence = 0.7

    return {"value": round(tempo_lib, 1), "confidence": round(confidence, 2)}


def detect_key(mix: np.ndarray, sr: int, bass_notes: list) -> dict | None:
    """Key detection with essentia, fallback to bass histogram."""
    if HAS_ESSENTIA:
        key_ext = es.KeyExtractor()
        key, scale, strength = key_ext(mix.astype(np.float32))
        confidence = float(strength)

        if confidence >= 0.6:
            note_to_midi = {
                "C": 48, "C#": 49, "D": 50, "Eb": 51, "E": 52, "F": 53,
                "F#": 54, "G": 55, "Ab": 56, "A": 57, "Bb": 58, "B": 59,
            }
            midi = note_to_midi.get(key, 48)
            mode = "minor" if scale == "minor" else "major"
            return {"root": key, "mode": mode, "midi": midi, "confidence": round(confidence, 2)}

    # Fallback: bass note histogram
    if bass_notes:
        pitch_classes = [n["midi"] % 12 for n in bass_notes]
        if pitch_classes:
            from collections import Counter
            most_common_pc = Counter(pitch_classes).most_common(1)[0][0]
            note_names = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]
            return {
                "root": note_names[most_common_pc],
                "mode": "minor",
                "midi": 48 + most_common_pc,
                "confidence": 0.4,
            }

    return None


def analyze_drums(drums_path: str, bpm: float) -> dict:
    """3-stage drum analysis: onset → spectral classify → grid quantize."""
    audio, sr = librosa.load(drums_path, sr=44100, mono=True)

    # Stage 1: onset detection
    if HAS_MADMOM:
        proc = madmom.features.onsets.RNNOnsetProcessor()
        act = proc(drums_path)
        picker = madmom.features.onsets.OnsetPeakPickingProcessor(threshold=0.3)
        onsets = picker(act)
    else:
        onset_frames = librosa.onset.onset_detect(y=audio, sr=sr, backtrack=True)
        onsets = librosa.frames_to_time(onset_frames, sr=sr)

    # Stage 2: spectral classification
    kick_pos, snare_pos, hat_pos = [], [], []
    hop = 512
    n_fft = 2048

    S = np.abs(librosa.stft(audio, n_fft=n_fft, hop_length=hop))
    freqs = librosa.fft_frequencies(sr=sr, n_fft=n_fft)

    low_mask = freqs < 200
    mid_mask = (freqs >= 200) & (freqs < 5000)
    high_mask = freqs >= 5000

    for onset_time in onsets:
        frame_idx = int(onset_time * sr / hop)
        if frame_idx >= S.shape[1]:
            continue

        spectrum = S[:, frame_idx]
        low_energy = np.sum(spectrum[low_mask] ** 2)
        mid_energy = np.sum(spectrum[mid_mask] ** 2)
        high_energy = np.sum(spectrum[high_mask] ** 2)
        total = low_energy + mid_energy + high_energy + 1e-10

        if low_energy / total > 0.5:
            kick_pos.append(float(onset_time))
        elif high_energy / total > 0.4:
            hat_pos.append(float(onset_time))
        elif mid_energy / total > 0.3:
            snare_pos.append(float(onset_time))
        else:
            hat_pos.append(float(onset_time))

    # Stage 3: BPM grid quantize (16th note)
    grid_size = 15.0 / bpm  # 16th note duration
    kick_pos = [round(round(t / grid_size) * grid_size, 4) for t in kick_pos]
    snare_pos = [round(round(t / grid_size) * grid_size, 4) for t in snare_pos]
    hat_pos = [round(round(t / grid_size) * grid_size, 4) for t in hat_pos]

    # Deduplicate
    kick_pos = sorted(set(kick_pos))
    snare_pos = sorted(set(snare_pos))
    hat_pos = sorted(set(hat_pos))

    return {
        "kick_positions": kick_pos,
        "snare_positions": snare_pos,
        "hat_positions": hat_pos,
    }


def analyze_pitch(stem_path: str, min_confidence: float = 0.5) -> list[dict]:
    """5-stage pitch analysis via basic-pitch: predict → filter → segment → snap → slide."""
    if not HAS_BASIC_PITCH:
        return []

    # Stage 1: basic-pitch prediction (returns MIDI note events directly)
    model_output, midi_data, note_events = bp_predict(stem_path)

    if not note_events:
        return []

    notes = []
    for note in note_events:
        start_time = float(note[0])
        end_time = float(note[1])
        midi_note = int(note[2])
        velocity = float(note[3])
        duration = end_time - start_time

        # Stage 2+3: filter short/quiet notes
        if duration < 0.03 or velocity < min_confidence:
            continue

        freq = 440.0 * (2 ** ((midi_note - 69) / 12))
        notes.append({
            "time": round(start_time, 4),
            "freq": round(freq, 2),
            "midi": midi_note,
            "duration": round(duration, 4),
            "velocity": round(min(velocity, 1.0), 3),
            "confidence": round(min(velocity, 1.0), 3),
            "slide": False,
        })

    # Stage 5: slide inference
    for i in range(1, len(notes)):
        gap = notes[i]["time"] - (notes[i - 1]["time"] + notes[i - 1]["duration"])
        pitch_diff = abs(notes[i]["midi"] - notes[i - 1]["midi"])
        if pitch_diff > 2 and gap < 0.05:
            notes[i]["slide"] = True

    return notes


def compute_energy_curve(mix: np.ndarray, sr: int) -> list[float]:
    """1-point-per-second energy curve."""
    hop = sr  # 1 second
    rms_vals = []
    for i in range(0, len(mix), hop):
        chunk = mix[i:i + hop]
        rms = float(np.sqrt(np.mean(chunk ** 2)))
        rms_vals.append(round(rms, 6))
    return rms_vals


def compute_spectral_centroid(mix: np.ndarray, sr: int) -> list[float]:
    """1-point-per-second spectral centroid."""
    cent = librosa.feature.spectral_centroid(y=mix, sr=sr, hop_length=sr)
    return [round(float(c), 1) for c in cent[0]]


def detect_structure(mix: np.ndarray, sr: int, duration: float) -> list[dict]:
    """Simple energy-based structure detection."""
    energy = compute_energy_curve(mix, sr)
    if len(energy) < 4:
        return [{"start": 0.0, "end": duration, "label": "drop"}]

    max_e = max(energy) if max(energy) > 0 else 1
    norm = [e / max_e for e in energy]

    sections = []
    current_label = "build" if norm[0] < 0.5 else "drop"
    current_start = 0.0

    for i in range(1, len(norm)):
        if norm[i] >= 0.5 and current_label != "drop":
            sections.append({"start": current_start, "end": float(i), "label": current_label})
            current_start = float(i)
            current_label = "drop"
        elif norm[i] < 0.3 and current_label == "drop":
            sections.append({"start": current_start, "end": float(i), "label": current_label})
            current_start = float(i)
            current_label = "break"
        elif norm[i] >= 0.3 and current_label == "break":
            sections.append({"start": current_start, "end": float(i), "label": current_label})
            current_start = float(i)
            current_label = "build"

    sections.append({"start": current_start, "end": duration, "label": current_label})
    return sections


def select_peak_range(energy: list[float], duration_sec: float, window_sec: float = 20.0) -> dict:
    """Rolling window max energy sum for auto range selection."""
    window = int(window_sec)
    if len(energy) <= window:
        return {"start": 0.0, "end": min(duration_sec, window_sec)}

    best_start = 0
    best_sum = 0.0
    for i in range(len(energy) - window + 1):
        s = sum(energy[i:i + window])
        if s > best_sum:
            best_sum = s
            best_start = i

    return {"start": float(best_start), "end": float(min(best_start + window_sec, duration_sec))}


def analysis_qc(drums_rms: float, bass_rms: float, bpm_conf: float, bass_notes: list, duration: float) -> dict:
    """Pre-LLM quality gate."""
    warnings = []
    degraded = False

    if drums_rms < -50:
        warnings.append(f"Drums stem very quiet: {drums_rms:.1f} dBFS")
        degraded = True
    if bass_rms < -50:
        warnings.append(f"Bass stem very quiet: {bass_rms:.1f} dBFS")
        degraded = True
    if bpm_conf < 0.7:
        warnings.append(f"Low BPM confidence: {bpm_conf}")
        degraded = True

    # Bass voiced coverage
    total_dur = sum(n["duration"] for n in bass_notes) if bass_notes else 0
    coverage = total_dur / max(duration, 1)
    if coverage < 0.2:
        warnings.append(f"Low bass voiced coverage: {coverage:.0%}")
        degraded = True

    passed = len(warnings) == 0
    return {"passed": passed, "degraded": degraded, "warnings": warnings}


def main():
    parser = argparse.ArgumentParser(description="Acid Reinterpreter — Audio Analyzer")
    parser.add_argument("--drums", required=True, help="Path to drums stem WAV")
    parser.add_argument("--bass", required=True, help="Path to bass stem WAV")
    parser.add_argument("--other", required=True, help="Path to other stem WAV")
    parser.add_argument("--mix", required=True, help="Path to original mix WAV")
    parser.add_argument("--out", required=True, help="Output analysis.json path")
    parser.add_argument("--range-start", type=float, default=None)
    parser.add_argument("--range-end", type=float, default=None)
    args = parser.parse_args()

    # Load mix
    mix, sr = librosa.load(args.mix, sr=44100, mono=True)
    duration = float(len(mix) / sr)
    print(f"Mix loaded: {duration:.1f}s, sr={sr}")

    warnings_list = []

    # BPM
    bpm_result = detect_bpm(mix, sr)
    print(f"BPM: {bpm_result['value']} (confidence: {bpm_result['confidence']})")

    # Energy curve + range selection
    energy = compute_energy_curve(mix, sr)
    if args.range_start is not None and args.range_end is not None:
        selected_range = {"start": args.range_start, "end": args.range_end}
    else:
        selected_range = select_peak_range(energy, duration)
    print(f"Selected range: {selected_range['start']:.1f}s - {selected_range['end']:.1f}s")

    # Bass pitch analysis
    print("Analyzing bass stem...")
    bass_notes = analyze_pitch(args.bass)
    if not bass_notes:
        warnings_list.append("No bass notes detected (basic-pitch unavailable or silent stem)")
    else:
        print(f"Bass notes: {len(bass_notes)}")

    # Other stem pitch analysis
    print("Analyzing other stem...")
    other_notes = analyze_pitch(args.other)
    print(f"Other notes: {len(other_notes)}")

    # Key detection
    key_result = detect_key(mix, sr, bass_notes)
    if key_result is None:
        warnings_list.append("Key detection failed — using None")
    else:
        print(f"Key: {key_result['root']}{key_result['mode'][0]} (confidence: {key_result['confidence']})")

    # Drum analysis
    print("Analyzing drums stem...")
    drums_result = analyze_drums(args.drums, bpm_result["value"])
    print(f"Drums: {len(drums_result['kick_positions'])} kicks, {len(drums_result['snare_positions'])} snares, {len(drums_result['hat_positions'])} hats")

    # Spectral centroid
    spectral = compute_spectral_centroid(mix, sr)

    # Structure
    structure = detect_structure(mix, sr, duration)

    # QC gate
    drums_audio, _ = librosa.load(args.drums, sr=44100, mono=True)
    bass_audio, _ = librosa.load(args.bass, sr=44100, mono=True)
    qc = analysis_qc(
        drums_rms=rms_db(drums_audio),
        bass_rms=rms_db(bass_audio),
        bpm_conf=bpm_result["confidence"],
        bass_notes=bass_notes,
        duration=duration,
    )

    if not HAS_ESSENTIA:
        warnings_list.append("essentia not installed — Key detection degraded")
    if not HAS_BASIC_PITCH:
        warnings_list.append("basic-pitch not installed — pitch analysis unavailable")
    if not HAS_MADMOM:
        warnings_list.append("madmom not installed — using librosa onset detection")

    warnings_list.extend(qc["warnings"])

    result = {
        "bpm": bpm_result,
        "key": key_result,
        "duration": round(duration, 3),
        "selected_range": selected_range,
        "drums": drums_result,
        "bass": {"notes": bass_notes},
        "other": {"notes": other_notes},
        "energy_curve": energy,
        "spectral_centroid_curve": spectral,
        "structure": structure,
        "analysis_qc": qc,
        "warnings": warnings_list,
    }

    with open(args.out, "w") as f:
        json.dump(result, f, indent=2)
    print(f"Analysis saved: {args.out}")
    print(f"QC: passed={qc['passed']}, degraded={qc['degraded']}")

    if qc["degraded"] and not qc["passed"]:
        total_onsets = (len(drums_result["kick_positions"]) +
                        len(drums_result["snare_positions"]) +
                        len(drums_result["hat_positions"]))
        if total_onsets == 0 and rms_db(drums_audio) < -50:
            print("ABORT: drums stem completely silent with no onsets", file=sys.stderr)
            sys.exit(1)


if __name__ == "__main__":
    main()
