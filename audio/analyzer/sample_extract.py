#!/usr/bin/env python3
"""Extract individual hits from demucs stems — multi-feature classification."""

import os
import sys
import json
import numpy as np
import librosa
import soundfile as sf

MAX_HITS_PER_TYPE = 32
FADE_SAMPLES_1MS = 22  # ~1ms at 22050Hz


def classify_hit(segment, sr, stem_type):
    """Multi-feature classification (AC-11.3). stem_type overrides spectral."""
    if stem_type == 'bass':
        return 'bass'
    if stem_type == 'other':
        return 'fx'

    S = np.abs(librosa.stft(segment, n_fft=1024))
    freqs = librosa.fft_frequencies(sr=sr, n_fft=1024)
    total = np.sum(S) + 1e-10
    low_ratio = np.sum(S[freqs < 300]) / total
    high_ratio = np.sum(S[freqs > 3000]) / total
    flatness = float(np.mean(librosa.feature.spectral_flatness(y=segment)))

    if low_ratio > 0.4:
        return 'kick'
    if high_ratio > 0.5:
        return 'hat'
    if flatness > 0.3:
        return 'snare'
    return 'unknown'


def extract_hits(stem_path, output_dir, stem_type, sr=22050):
    """Extract hits with multi-feature classification + per-type naming + fade."""
    y, _ = librosa.load(stem_path, sr=sr, mono=True)
    onsets = librosa.onset.onset_detect(y=y, sr=sr, units='samples', backtrack=True)

    hits = []
    type_counters = {}

    for i, start in enumerate(onsets):
        end = onsets[i + 1] if i + 1 < len(onsets) else min(start + int(0.5 * sr), len(y))
        segment = y[start:end].copy()
        if len(segment) < int(0.01 * sr):
            continue

        # 1ms fade-in/out (E19: click artifact prevention)
        fade = min(FADE_SAMPLES_1MS, len(segment) // 4)
        if fade > 0:
            segment[:fade] *= np.linspace(0, 1, fade)
            segment[-fade:] *= np.linspace(1, 0, fade)

        hit_type = classify_hit(segment, sr, stem_type)
        type_counters[hit_type] = type_counters.get(hit_type, 0) + 1
        fname = f"{hit_type}_{type_counters[hit_type]:03d}.wav"

        os.makedirs(output_dir, exist_ok=True)
        sf.write(os.path.join(output_dir, fname), segment, sr)

        hits.append({
            'file': fname,
            'type': hit_type,
            'duration': round(len(segment) / sr, 3),
            'onset_time': round(start / sr, 3),
        })

    # MAX_HITS_PER_TYPE pruning (E17)
    manifest = {}
    for h in hits:
        manifest.setdefault(h['type'], []).append(h)
    for t in manifest:
        if len(manifest[t]) > MAX_HITS_PER_TYPE:
            for removed in manifest[t][MAX_HITS_PER_TYPE:]:
                path = os.path.join(output_dir, removed['file'])
                if os.path.exists(path):
                    os.remove(path)
            manifest[t] = manifest[t][:MAX_HITS_PER_TYPE]

    manifest_path = os.path.join(output_dir, 'manifest.json')
    with open(manifest_path, 'w') as f:
        json.dump(manifest, f, indent=2)

    return manifest


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print(f"Usage: python3 {sys.argv[0]} <stem.wav> <output_dir> <stem_type>", file=sys.stderr)
        sys.exit(1)

    stem_path = os.path.realpath(sys.argv[1])
    out_dir = os.path.realpath(sys.argv[2])
    stem_type = sys.argv[3]

    # Path validation
    project_root = os.path.realpath(os.path.join(os.path.dirname(__file__), '..', '..'))
    if not stem_path.startswith(project_root):
        print(f"Error: path outside project root", file=sys.stderr)
        sys.exit(1)

    result = extract_hits(stem_path, out_dir, stem_type)
    print(f"Extracted: {sum(len(v) for v in result.values())} hits")
    for t, hits in result.items():
        print(f"  {t}: {len(hits)}")
