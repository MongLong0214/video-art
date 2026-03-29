#!/usr/bin/env python3
"""Generate synthetic TR-909 style drum samples.

Placeholder until CC0 sample pack is sourced (OQ-1).
Run once: python3 audio/samples/909/generate.py
"""

import numpy as np
import soundfile as sf
import os

SR = 44100
OUT_DIR = os.path.dirname(__file__)


def generate_kick(duration=0.3):
    """909 kick: pitch sweep sine (150→50Hz) + click transient."""
    t = np.arange(int(SR * duration)) / SR
    # Pitch sweep: exponential decay from 150 to 50 Hz
    freq = 50 + 100 * np.exp(-t * 30)
    phase = 2 * np.pi * np.cumsum(freq) / SR
    body = np.sin(phase) * np.exp(-t * 8)
    # Click transient
    click = np.random.randn(int(SR * 0.003)) * 0.6 * np.exp(-np.arange(int(SR * 0.003)) / (SR * 0.0005))
    out = body.copy()
    out[:len(click)] += click
    return np.clip(out * 0.9, -1, 1).astype(np.float32)


def generate_clap(duration=0.2):
    """909 clap: filtered noise bursts + reverb tail."""
    t = np.arange(int(SR * duration)) / SR
    # Multiple noise bursts (the 909 clap "flam")
    clap = np.zeros(int(SR * duration))
    for offset_ms in [0, 8, 16, 24]:
        start = int(SR * offset_ms / 1000)
        burst_len = int(SR * 0.01)
        if start + burst_len <= len(clap):
            burst = np.random.randn(burst_len) * 0.5 * np.exp(-np.arange(burst_len) / (SR * 0.003))
            clap[start:start + burst_len] += burst
    # Tail
    tail = np.random.randn(len(clap)) * 0.3 * np.exp(-t * 20)
    clap += tail
    # Bandpass feel: HPF
    from scipy.signal import butter, sosfilt
    sos = butter(2, [800 / (SR / 2), 4000 / (SR / 2)], btype='band', output='sos')
    clap = sosfilt(sos, clap)
    return np.clip(clap * 1.5, -1, 1).astype(np.float32)


def generate_hat_closed(duration=0.05):
    """909 closed hat: filtered noise, very short."""
    t = np.arange(int(SR * duration)) / SR
    noise = np.random.randn(len(t)) * np.exp(-t * 100)
    # HPF
    from scipy.signal import butter, sosfilt
    sos = butter(2, 6000 / (SR / 2), btype='high', output='sos')
    hat = sosfilt(sos, noise)
    return np.clip(hat * 2.0, -1, 1).astype(np.float32)


def generate_hat_open(duration=0.3):
    """909 open hat: filtered noise, longer decay."""
    t = np.arange(int(SR * duration)) / SR
    noise = np.random.randn(len(t)) * np.exp(-t * 12)
    from scipy.signal import butter, sosfilt
    sos = butter(2, 6000 / (SR / 2), btype='high', output='sos')
    hat = sosfilt(sos, noise)
    return np.clip(hat * 1.5, -1, 1).astype(np.float32)


def generate_ride(duration=0.8):
    """909 ride: metallic noise + sine harmonics."""
    t = np.arange(int(SR * duration)) / SR
    noise = np.random.randn(len(t)) * np.exp(-t * 4)
    # Metallic partials
    metal = np.sin(2 * np.pi * 845 * t) * 0.2 * np.exp(-t * 6)
    metal += np.sin(2 * np.pi * 1680 * t) * 0.15 * np.exp(-t * 8)
    from scipy.signal import butter, sosfilt
    sos = butter(2, 4000 / (SR / 2), btype='high', output='sos')
    ride = sosfilt(sos, noise * 0.5 + metal)
    return np.clip(ride * 1.2, -1, 1).astype(np.float32)


def generate_snare(duration=0.2):
    """909 snare: sine body + noise snap."""
    t = np.arange(int(SR * duration)) / SR
    body = np.sin(2 * np.pi * 180 * t) * np.exp(-t * 20) * 0.7
    noise = np.random.randn(len(t)) * np.exp(-t * 15) * 0.5
    from scipy.signal import butter, sosfilt
    sos = butter(2, [1000 / (SR / 2), 8000 / (SR / 2)], btype='band', output='sos')
    snap = sosfilt(sos, noise)
    snare = body + snap
    return np.clip(snare * 1.2, -1, 1).astype(np.float32)


def main():
    samples = {
        "kick.wav": generate_kick(),
        "clap.wav": generate_clap(),
        "hat-closed.wav": generate_hat_closed(),
        "hat-open.wav": generate_hat_open(),
        "ride.wav": generate_ride(),
        "snare.wav": generate_snare(),
    }

    for name, audio in samples.items():
        path = os.path.join(OUT_DIR, name)
        sf.write(path, audio, SR)
        dur_ms = len(audio) / SR * 1000
        print(f"  {name}: {dur_ms:.0f}ms, peak={np.max(np.abs(audio)):.2f}")

    print(f"\nGenerated {len(samples)} samples in {OUT_DIR}")


if __name__ == "__main__":
    main()
