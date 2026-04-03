#!/usr/bin/env python3
"""Acid Reinterpreter — Step 4: 303/909 Rendering via pedalboard + JC-303 VST3."""

import argparse
import json
import os
import sys

import numpy as np
import soundfile as sf

try:
    import pedalboard
    from pedalboard import Compressor, HighpassFilter
    from pedalboard.io import AudioFile
    HAS_PEDALBOARD = True
except ImportError:
    HAS_PEDALBOARD = False

JC303_DEFAULT_PATH = os.path.expanduser("~/Library/Audio/Plug-Ins/VST3/JC303.vst3")
SR = 44100


def render_303_track(events: list[dict], synth, duration: float) -> np.ndarray:
    """Render 303 events in a single pass — preserves slide/accent/filter state."""
    if not events:
        return np.zeros((2, int(duration * SR)), dtype=np.float32)

    # Global knob positions — use median values from events
    cutoffs = [e.get("cutoff", 400) for e in events]
    synth.cutoff = (sum(cutoffs) / len(cutoffs)) / 5000
    synth.resonance = events[0].get("resonance", 0.85)
    synth.envmod = events[0].get("envMod", 0.5)
    synth.decay = events[0].get("decay", 0.3)
    synth.waveform = float(events[0].get("waveform", 0))
    # accent controlled by velocity, not knob
    synth.accent = 0.8

    midi_msgs = []
    for event in events:
        t = event["time"]
        midi_note = event["note_midi"]
        # Accent via high velocity (303 convention: >100 = accent)
        vel = 120 if event.get("accent", False) else max(1, min(100, int(event["velocity"] * 100)))

        # Slide = legato: note_on BEFORE previous note_off (overlap by 1ms)
        if event.get("slide", False):
            midi_msgs.append((bytes([0x90, midi_note, vel]), max(0, t - 0.001)))
            midi_msgs.append((bytes([0x80, midi_note, 0]), t + event["duration"]))
        else:
            midi_msgs.append((bytes([0x90, midi_note, vel]), t))
            off_time = min(t + event["duration"], duration - 0.001)
            midi_msgs.append((bytes([0x80, midi_note, 0]), off_time))

    midi_msgs.sort(key=lambda x: x[1])
    audio = synth(midi_msgs, duration=duration, sample_rate=SR, num_channels=2, reset=True)
    return audio


def render_909_drums(interpretation: dict, samples_dir: str, duration: float) -> np.ndarray:
    """Render 909 drum patterns from samples."""
    bpm = interpretation["bpm"]
    bar_dur = 4 * 60 / bpm
    step_dur = bar_dur / 16  # 16th note
    num_bars = int(np.ceil(duration / bar_dur))

    # Load samples
    sample_map = {
        "kick": "kick.wav",
        "snare": "snare.wav",
        "hat": "hat-closed.wav",
        "hat_open": "hat-open.wav",
        "clap": "clap.wav",
    }
    samples = {}
    for name, filename in sample_map.items():
        fpath = os.path.join(samples_dir, filename)
        if os.path.exists(fpath):
            data, sr = sf.read(fpath)
            if data.ndim == 1:
                data = np.stack([data, data])  # mono to stereo
            elif data.ndim == 2:
                data = data.T  # (samples, channels) -> (channels, samples)
            samples[name] = data
        else:
            print(f"Warning: missing 909 sample {fpath}")

    total_samples = int(duration * SR)
    output = np.zeros((2, total_samples), dtype=np.float32)

    tracks = interpretation["tracks"]

    def place_pattern(pattern_data: dict, sample_name: str, open_pattern: list | None = None, start_bar: int = 0):
        pattern = pattern_data["pattern"]
        velocity = pattern_data["velocity"]
        for bar in range(start_bar, num_bars):
            for step in range(min(len(pattern), 16)):
                if pattern[step] == 0:
                    continue
                t = bar * bar_dur + step * step_dur
                sample_idx = int(t * SR)
                if sample_idx >= total_samples:
                    break

                # Choose open/closed hat
                use_sample = sample_name
                if open_pattern and step < len(open_pattern) and open_pattern[step]:
                    use_sample = "hat_open"

                if use_sample not in samples:
                    continue
                smp = samples[use_sample]
                vel = velocity[step] if step < len(velocity) else 0.5
                end = min(sample_idx + smp.shape[1], total_samples)
                length = end - sample_idx
                output[:, sample_idx:end] += smp[:, :length] * vel

    hat_entry = interpretation.get("_hat_entry_bar", 0)
    place_pattern(tracks["kick_909"], "kick", start_bar=0)
    place_pattern(tracks["hat_909"], "hat", tracks["hat_909"].get("open_pattern"), start_bar=hat_entry)
    place_pattern(tracks["snare_909"], "snare", start_bar=hat_entry)

    # Drum processing — club-style: boost low end + reverb tail + compression
    if HAS_PEDALBOARD:
        from pedalboard import LowShelfFilter, Reverb, Gain
        board = pedalboard.Pedalboard([
            HighpassFilter(cutoff_frequency_hz=28),
            LowShelfFilter(cutoff_frequency_hz=80, gain_db=2.0),
            Reverb(room_size=0.25, wet_level=0.08, width=0.6),
            Compressor(threshold_db=-10, ratio=3, attack_ms=5, release_ms=60),
            Gain(gain_db=1.0),
        ])
        output = board(output, SR)

    return output


def main():
    parser = argparse.ArgumentParser(description="Acid Reinterpreter — 303/909 Renderer")
    parser.add_argument("--interpretation", required=True, help="Path to interpretation.json")
    parser.add_argument("--samples-dir", required=True, help="Path to 909 samples directory")
    parser.add_argument("--jc303-path", default=JC303_DEFAULT_PATH, help="Path to JC-303 VST3")
    parser.add_argument("--out-dir", required=True, help="Output directory for rendered stems")
    parser.add_argument("--duration", type=float, default=20.0)
    args = parser.parse_args()

    if not HAS_PEDALBOARD:
        print("Error: pedalboard not installed. pip install pedalboard", file=sys.stderr)
        sys.exit(1)

    if not os.path.exists(args.jc303_path):
        print(f"Error: JC-303 VST3 not found at {args.jc303_path}", file=sys.stderr)
        print("Install: https://github.com/midilab/jc303/releases", file=sys.stderr)
        sys.exit(1)

    os.makedirs(args.out_dir, exist_ok=True)

    with open(args.interpretation) as f:
        interpretation = json.load(f)

    duration = args.duration

    # Load JC-303 once
    print("Loading JC-303 VST3...")
    synth = pedalboard.load_plugin(args.jc303_path)

    # Render 303 bass
    print("Rendering bass_303...")
    bass_events = interpretation["tracks"]["bass_303"]["events"]
    if bass_events:
        bass_audio = render_303_track(bass_events, synth, duration)
        bass_path = os.path.join(args.out_dir, "bass_303.wav")
        with AudioFile(bass_path, "w", SR, 2) as f:
            f.write(bass_audio)
        print(f"  {len(bass_events)} events → {bass_path}")
    else:
        print("  No bass events, skipping")

    # Render 303 riff
    print("Rendering riff_303...")
    riff_events = interpretation["tracks"]["riff_303"]["events"]
    if riff_events:
        riff_audio = render_303_track(riff_events, synth, duration)
        riff_path = os.path.join(args.out_dir, "riff_303.wav")
        with AudioFile(riff_path, "w", SR, 2) as f:
            f.write(riff_audio)
        print(f"  {len(riff_events)} events → {riff_path}")
    else:
        print("  No riff events, skipping")

    # Render 303 stab (optional layer)
    stab_events = interpretation["tracks"].get("stab_303", {}).get("events", [])
    if stab_events:
        print("Rendering stab_303...")
        stab_audio = render_303_track(stab_events, synth, duration)
        stab_path = os.path.join(args.out_dir, "stab_303.wav")
        with AudioFile(stab_path, "w", SR, 2) as f:
            f.write(stab_audio)
        print(f"  {len(stab_events)} events → {stab_path}")

    # Render 303 arp (optional layer)
    arp_events = interpretation["tracks"].get("arp_303", {}).get("events", [])
    if arp_events:
        print("Rendering arp_303...")
        arp_audio = render_303_track(arp_events, synth, duration)
        arp_path = os.path.join(args.out_dir, "arp_303.wav")
        with AudioFile(arp_path, "w", SR, 2) as f:
            f.write(arp_audio)
        print(f"  {len(arp_events)} events → {arp_path}")

    # Render 303 sub (optional layer)
    sub_events = interpretation["tracks"].get("sub_303", {}).get("events", [])
    if sub_events:
        print("Rendering sub_303...")
        sub_audio = render_303_track(sub_events, synth, duration)
        sub_path = os.path.join(args.out_dir, "sub_303.wav")
        with AudioFile(sub_path, "w", SR, 2) as f:
            f.write(sub_audio)
        print(f"  {len(sub_events)} events → {sub_path}")

    # Render 303 pad (optional layer)
    pad_events = interpretation["tracks"].get("pad_303", {}).get("events", [])
    if pad_events:
        print("Rendering pad_303...")
        pad_audio = render_303_track(pad_events, synth, duration)
        pad_path = os.path.join(args.out_dir, "pad_303.wav")
        with AudioFile(pad_path, "w", SR, 2) as f:
            f.write(pad_audio)
        print(f"  {len(pad_events)} events → {pad_path}")

    # Render 909 drums
    print("Rendering drums_909...")
    drums_audio = render_909_drums(interpretation, args.samples_dir, duration)
    drums_path = os.path.join(args.out_dir, "drums_909.wav")
    with AudioFile(drums_path, "w", SR, 2) as f:
        f.write(drums_audio)
    print(f"  → {drums_path}")

    print("Render complete.")


if __name__ == "__main__":
    main()
