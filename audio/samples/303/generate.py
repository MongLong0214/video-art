#!/usr/bin/env python3
"""Generate chromatic TB-303-style sample bank + manifest v2."""

import json
import os
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt

SR = 44100
OUT_DIR = Path(__file__).resolve().parent
MANIFEST_PATH = OUT_DIR / "manifest.json"

CHROMATIC_NOTES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]
NOTE_NAME_BY_PC = {
    0: "C",
    1: "C#",
    2: "D",
    3: "Eb",
    4: "E",
    5: "F",
    6: "F#",
    7: "G",
    8: "Ab",
    9: "A",
    10: "Bb",
    11: "B",
}

ARTICULATION_SPECS = {
    "normal": {"duration": 0.40, "cutoff_peak": 2500, "cutoff_end": 200, "reso": 0.75, "decay_ms": 250, "filter_decay_ms": 150, "accent": False, "drive": 1.2},
    "accent": {"duration": 0.45, "cutoff_peak": 6000, "cutoff_end": 300, "reso": 0.90, "decay_ms": 300, "filter_decay_ms": 180, "accent": True, "drive": 1.8},
    "stab": {"duration": 0.12, "cutoff_peak": 8000, "cutoff_end": 400, "reso": 0.85, "decay_ms": 60, "filter_decay_ms": 40, "accent": False, "drive": 2.0},
    "squelch": {"duration": 0.30, "cutoff_peak": 10000, "cutoff_end": 200, "reso": 0.97, "decay_ms": 180, "filter_decay_ms": 100, "accent": False, "drive": 2.2},
    "long": {"duration": 0.80, "cutoff_peak": 1800, "cutoff_end": 150, "reso": 0.70, "decay_ms": 600, "filter_decay_ms": 400, "accent": False, "drive": 1.1},
}

FX_SPECS = [
    ("sweep_mild", 0.85, 4000),
    ("sweep_acid", 0.95, 8000),
    ("sweep_scream", 0.99, 14000),
]

ROLE_TAGS_BY_ARTICULATION = {
    "normal": ["bass", "riff"],
    "accent": ["bass", "riff"],
    "stab": ["riff", "top"],
    "squelch": ["riff", "fx"],
    "long": ["bass", "riff"],
}

PERCUSSION_VARIANTS = {
    "click": {"count": 2, "duration": 0.05, "role_tags": ["top", "pseudo_hat"], "rate_range": {"min": 0.9, "max": 1.3}},
    "tick": {"count": 2, "duration": 0.07, "role_tags": ["top", "pseudo_hat"], "rate_range": {"min": 0.85, "max": 1.2}},
    "chirp": {"count": 2, "duration": 0.12, "role_tags": ["top", "fx"], "rate_range": {"min": 0.8, "max": 1.25}},
    "hat_short": {"count": 2, "duration": 0.08, "role_tags": ["top", "pseudo_hat"], "rate_range": {"min": 0.9, "max": 1.15}},
    "hat_open": {"count": 2, "duration": 0.18, "role_tags": ["top", "pseudo_hat"], "rate_range": {"min": 0.85, "max": 1.1}},
}


def midi_to_freq(midi):
    return 440.0 * (2 ** ((midi - 69) / 12))


def midi_to_name(midi):
    pc = midi % 12
    octave = midi // 12 - 1
    return f"{NOTE_NAME_BY_PC[pc]}{octave}"


def get_chromatic_notes():
    notes = []
    for midi in range(24, 73):  # C1 .. C5 inclusive
        notes.append((midi_to_name(midi), midi, midi_to_freq(midi)))
    return notes


def tb303_filter(sig, cutoff_curve, reso=0.8):
    chunk = 32
    out = np.zeros_like(sig)
    zi = np.zeros((2, 2))

    for i in range(0, len(sig), chunk):
        end = min(i + chunk, len(sig))
        mid = min(i + chunk // 2, len(sig) - 1)
        freq = np.clip(cutoff_curve[mid], 30, SR / 2 - 500)
        wn = np.clip(freq / (SR / 2), 0.001, 0.999)
        try:
            sos = butter(4, wn, btype="low", output="sos")
            chunk_out, zi = sosfilt(sos, sig[i:end], zi=zi)
            out[i:end] = chunk_out
        except Exception:
            out[i:end] = sig[i:end]

    feedback = reso * 0.6 * np.tanh(out * (2 + reso * 3))
    return out + feedback


def env_vca(n, attack_ms=3, decay_ms=200, sustain=0.0, accent=False):
    attack = max(1, int(SR * attack_ms / 1000))
    env = np.zeros(n)
    env[:attack] = np.linspace(0, 1.0, attack)
    remaining = n - attack
    t = np.arange(remaining) / SR
    if accent:
        env[attack:] = 0.15 + 0.85 * np.exp(-t * 1000 / (decay_ms * 1.5))
    else:
        env[attack:] = sustain + (1.0 - sustain) * np.exp(-t * 1000 / decay_ms)
    return env


def env_filter(n, start_hz, peak_hz, end_hz, attack_ms=2, decay_ms=150, accent=False):
    attack = max(1, int(SR * attack_ms / 1000))
    if accent:
        peak_hz = min(peak_hz * 2.5, 16000)
        decay_ms *= 1.2
    env = np.zeros(n)
    env[:attack] = np.linspace(start_hz, peak_hz, attack)
    remaining = n - attack
    t = np.arange(remaining) / SR
    env[attack:] = end_hz + (peak_hz - end_hz) * np.exp(-t * 1000 / decay_ms)
    return np.clip(env, 30, 18000)


def saw_303(freq, duration):
    n = int(SR * duration)
    t = np.arange(n) / SR
    phase = (freq * t) % 1.0
    sig = 2.0 * phase - 1.0
    sos = butter(1, min(freq * 8, SR / 2 - 500) / (SR / 2), btype="low", output="sos")
    return sosfilt(sos, sig)


def square_303(freq, duration):
    n = int(SR * duration)
    t = np.arange(n) / SR
    phase = (freq * t) % 1.0
    sig = np.where(phase < 0.5, 1.0, -1.0).astype(np.float64)
    sos = butter(1, min(freq * 6, SR / 2 - 500) / (SR / 2), btype="low", output="sos")
    return sosfilt(sos, sig)


def slide_osc(freq_start, freq_end, duration, waveform="saw"):
    n = int(SR * duration)
    t = np.arange(n) / SR
    glide_time = 0.06
    freq = freq_start + (freq_end - freq_start) * (1 - np.exp(-t / glide_time))
    phase = np.cumsum(freq / SR) % 1.0
    if waveform == "saw":
        return 2.0 * phase - 1.0
    return np.where(phase < 0.5, 1.0, -1.0).astype(np.float64)


def normalize_audio(sig, target_peak=0.9):
    peak = np.max(np.abs(sig))
    if peak > 0:
        sig = sig / peak * target_peak
    return sig.astype(np.float32)


def estimate_lufs(audio):
    rms = np.sqrt(np.mean(audio ** 2) + 1e-10)
    return round(float(20 * np.log10(rms + 1e-10)), 2)


def estimate_centroid(audio):
    spectrum = np.abs(np.fft.rfft(audio)) + 1e-9
    freqs = np.fft.rfftfreq(len(audio), 1 / SR)
    centroid = np.sum(freqs * spectrum) / np.sum(spectrum)
    return round(float(centroid), 2)


def estimate_transient_strength(audio):
    abs_audio = np.abs(audio)
    onset = abs_audio[: max(1, int(0.02 * SR))]
    tail = abs_audio[max(1, int(0.02 * SR)):]
    onset_rms = np.sqrt(np.mean(onset ** 2) + 1e-10)
    tail_rms = np.sqrt(np.mean(tail ** 2) + 1e-10) if len(tail) else 1e-5
    strength = onset_rms / max(tail_rms, 1e-5)
    return round(float(strength), 3)


def generate_303_note(freq, waveform="saw", **params):
    duration = params["duration"]
    if waveform == "saw":
        sig = saw_303(freq, duration)
    else:
        sig = square_303(freq, duration)

    n = len(sig)
    fenv = env_filter(
        n,
        params["cutoff_end"] * 1.5,
        params["cutoff_peak"],
        params["cutoff_end"],
        attack_ms=2,
        decay_ms=params["filter_decay_ms"],
        accent=params["accent"],
    )
    sig = tb303_filter(sig, fenv, reso=params["reso"])
    sig = np.tanh(sig * params["drive"])
    sig *= env_vca(n, attack_ms=2, decay_ms=params["decay_ms"], accent=params["accent"])
    return normalize_audio(sig)


def generate_slide_note(freq_start, freq_end, waveform="saw", duration=0.5, cutoff_peak=4000, reso=0.85):
    sig = slide_osc(freq_start, freq_end, duration, waveform)
    n = len(sig)
    fenv = env_filter(n, 300, cutoff_peak, 250, decay_ms=250)
    sig = tb303_filter(sig, fenv, reso=reso)
    sig = np.tanh(sig * 1.3)
    sig *= env_vca(n, decay_ms=400)
    return normalize_audio(sig)


def write_sample(path, audio):
    sf.write(path, audio, SR)


def build_manifest_entry(file_name, note_name, midi, waveform, articulation, duration_ms, slide=None, role_tags=None,
                         transient_strength=None, recommended_rate_range=None, round_robin=1):
    path = OUT_DIR / file_name
    audio, _ = sf.read(path)
    return {
        "id": path.stem,
        "file": f"audio/samples/303/{file_name}",
        "root_note": note_name,
        "midi": midi,
        "waveform": waveform,
        "articulation": articulation,
        "role_tags": role_tags or ROLE_TAGS_BY_ARTICULATION.get(articulation, ["bass"]),
        "duration_ms": duration_ms,
        "lufs": estimate_lufs(audio),
        "centroid_hz": estimate_centroid(audio),
        "transient_strength": transient_strength if transient_strength is not None else estimate_transient_strength(audio),
        "recommended_rate_range": recommended_rate_range or {"min": 0.9, "max": 1.1},
        "slide": slide,
        "round_robin": round_robin,
        "source_bank_version": "chromatic-v1",
    }


def generate_fx_manifest_entry(file_name, articulation, role_tags, recommended_rate_range=None, round_robin=1):
    path = OUT_DIR / file_name
    audio, _ = sf.read(path)
    return {
        "id": path.stem,
        "file": f"audio/samples/303/{file_name}",
        "root_note": "C3",
        "midi": 48,
        "waveform": "saw",
        "articulation": articulation,
        "role_tags": role_tags,
        "duration_ms": round(len(audio) / SR * 1000),
        "lufs": estimate_lufs(audio),
        "centroid_hz": estimate_centroid(audio),
        "transient_strength": estimate_transient_strength(audio),
        "recommended_rate_range": recommended_rate_range or {"min": 0.85, "max": 1.15},
        "slide": None,
        "round_robin": round_robin,
        "source_bank_version": "chromatic-v1",
    }


def generate_percussive_sample(kind, duration, variant_index):
    n = int(SR * duration)
    t = np.arange(n) / SR
    rng = np.random.default_rng(1000 + variant_index * 37 + len(kind))

    if kind == "click":
        noise = rng.standard_normal(n) * 0.15
        impulse = np.exp(-t * 140) * np.sin(2 * np.pi * 1800 * t)
        sig = (noise + impulse) * np.exp(-t * 90)
    elif kind == "tick":
        sig = np.sin(2 * np.pi * (2400 + variant_index * 180) * t) * np.exp(-t * 70)
    elif kind == "chirp":
        sweep = 2800 + 4200 * (1 - np.exp(-t * 12))
        phase = np.cumsum(sweep / SR)
        sig = np.sin(2 * np.pi * phase) * np.exp(-t * 16)
    elif kind == "hat_short":
        noise = rng.standard_normal(n)
        sig = noise * np.exp(-t * 45)
        sig = np.tanh(sig * 1.8)
    elif kind == "hat_open":
        noise = rng.standard_normal(n)
        sig = noise * np.exp(-t * 18)
        sig = np.tanh(sig * 1.4)
    else:
        sig = rng.standard_normal(n) * np.exp(-t * 35)

    hp_cut = 2200 if "hat" in kind else 1200
    sos = butter(2, hp_cut / (SR / 2), btype="high", output="sos")
    sig = sosfilt(sos, sig)
    return normalize_audio(sig, target_peak=0.82)


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    notes = get_chromatic_notes()
    manifest = []
    count = 0

    print("=== TB-303 Chromatic Sample Generator ===")
    print(f"Notes: {len(notes)} (C1-C5 chromatic)")

    for note_name, midi, freq in notes:
        for waveform in ("saw", "square"):
            prefix = f"{note_name}_{waveform}"
            for articulation, spec in ARTICULATION_SPECS.items():
                audio = generate_303_note(freq, waveform=waveform, **spec)
                file_name = f"{prefix}_{articulation}.wav"
                write_sample(OUT_DIR / file_name, audio)
                manifest.append(build_manifest_entry(
                    file_name=file_name,
                    note_name=note_name,
                    midi=midi,
                    waveform=waveform,
                    articulation=articulation,
                    duration_ms=round(spec["duration"] * 1000),
                    recommended_rate_range={"min": 0.9, "max": 1.1},
                ))
                count += 1

    print("Generating chromatic slides...")
    for idx in range(len(notes) - 1):
        name1, midi1, freq1 = notes[idx]
        name2, midi2, freq2 = notes[idx + 1]
        for source, target in [
            ((name1, midi1, freq1), (name2, midi2, freq2)),
            ((name2, midi2, freq2), (name1, midi1, freq1)),
        ]:
            src_name, src_midi, src_freq = source
            dst_name, _, dst_freq = target
            file_name = f"slide_{src_name}_to_{dst_name}_saw.wav"
            write_sample(OUT_DIR / file_name, generate_slide_note(src_freq, dst_freq, waveform="saw"))
            manifest.append(build_manifest_entry(
                file_name=file_name,
                note_name=src_name,
                midi=src_midi,
                waveform="saw",
                articulation="slide",
                duration_ms=500,
                slide={"from": src_name, "to": dst_name, "type": "semitone"},
                role_tags=["bass", "riff"],
                recommended_rate_range={"min": 0.95, "max": 1.05},
            ))
            count += 1

    print("Generating FX textures...")
    for sweep_name, reso, peak in FX_SPECS:
        n = int(SR * 1.0)
        sig = saw_303(midi_to_freq(48), 1.0)
        fenv = env_filter(n, 200, peak, 100, decay_ms=500)
        sig = tb303_filter(sig, fenv, reso=reso)
        sig = np.tanh(sig * 2.0)
        sig *= env_vca(n, decay_ms=800)
        file_name = f"fx_{sweep_name}.wav"
        write_sample(OUT_DIR / file_name, normalize_audio(sig))
        manifest.append(generate_fx_manifest_entry(file_name, "sweep", ["fx"], recommended_rate_range={"min": 0.9, "max": 1.1}))
        count += 1

    n = int(SR * 0.3)
    noise = np.random.randn(n) * 0.3
    fenv = env_filter(n, 100, 6000, 80, decay_ms=80)
    sig = tb303_filter(noise, fenv, reso=0.98)
    sig = np.tanh(sig * 3.0)
    sig *= env_vca(n, decay_ms=150)
    write_sample(OUT_DIR / "fx_zap.wav", normalize_audio(sig, target_peak=0.85))
    manifest.append(generate_fx_manifest_entry("fx_zap.wav", "zap", ["fx", "top"], recommended_rate_range={"min": 0.9, "max": 1.2}))
    count += 1

    print("Generating pseudo-percussion variants...")
    for kind, spec in PERCUSSION_VARIANTS.items():
        for variant in range(1, spec["count"] + 1):
            file_name = f"{kind}_rr{variant}.wav"
            audio = generate_percussive_sample(kind, spec["duration"], variant)
            write_sample(OUT_DIR / file_name, audio)
            manifest.append(generate_fx_manifest_entry(
                file_name=file_name,
                articulation=kind,
                role_tags=spec["role_tags"],
                recommended_rate_range=spec["rate_range"],
                round_robin=variant,
            ))
            count += 1

    manifest.sort(key=lambda entry: entry["id"])
    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump({"version": 2, "samples": manifest}, f, indent=2)

    print(f"Generated {count} samples")
    print(f"Manifest: {MANIFEST_PATH}")


if __name__ == "__main__":
    main()
