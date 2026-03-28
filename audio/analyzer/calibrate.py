#!/usr/bin/env python3
"""Composite similarity score — 5-metric dual-score with LUFS normalization."""

import sys
import os
import json
import numpy as np
import librosa

try:
    import pyloudnorm as pyln
    HAS_PYLOUDNORM = True
except ImportError:
    HAS_PYLOUDNORM = False


def composite_similarity(ref_path, synth_path, sr=22050):
    """Multi-dimensional similarity score. Returns 0-100 with LUFS normalization."""
    y_ref, _ = librosa.load(ref_path, sr=sr)
    y_synth, _ = librosa.load(synth_path, sr=sr)

    lufs_normalized = False
    if HAS_PYLOUDNORM:
        meter = pyln.Meter(sr)
        ref_loud = meter.integrated_loudness(y_ref)
        synth_loud = meter.integrated_loudness(y_synth)
        if ref_loud > -70:
            y_ref = pyln.normalize.loudness(y_ref, ref_loud, -14.0)
        if synth_loud > -70:
            y_synth = pyln.normalize.loudness(y_synth, synth_loud, -14.0)
        lufs_normalized = True

    # Guard: silence / near-zero energy
    ref_energy = np.sum(y_ref ** 2)
    if ref_energy < 1e-10:
        return {
            'total_score': 0.0,
            'breakdown': {k: 0.0 for k in ['mfcc', 'spectral', 'envelope', 'attacks', 'chroma']},
            'weights': {'mfcc': 0.30, 'spectral': 0.20, 'envelope': 0.20, 'attacks': 0.15, 'chroma': 0.15},
            'lufs_normalized': lufs_normalized,
            'warning': 'reference is silent or near-zero energy',
        }

    scores = {}

    # 1. MFCC + DTW (timbral) — 30%
    mfcc_ref = librosa.feature.mfcc(y=y_ref, sr=sr, n_mfcc=13)
    mfcc_synth = librosa.feature.mfcc(y=y_synth, sr=sr, n_mfcc=13)
    D, wp = librosa.sequence.dtw(X=mfcc_ref, Y=mfcc_synth, metric='cosine')
    scores['mfcc'] = max(0, 1.0 - D[-1, -1] / max(len(wp), 1)) * 100

    # 2. Spectral convergence — 20%
    min_len = min(len(y_ref), len(y_synth))
    S_ref = np.abs(librosa.stft(y_ref[:min_len]))
    S_synth = np.abs(librosa.stft(y_synth[:min_len]))
    ref_norm = np.linalg.norm(S_ref, 'fro')
    sc = np.linalg.norm(S_ref - S_synth, 'fro') / max(ref_norm, 1e-10)
    scores['spectral'] = max(0, (1.0 - sc)) * 100

    # 3. RMS envelope correlation — 20%
    rms_ref = librosa.feature.rms(y=y_ref)[0]
    rms_synth = librosa.feature.rms(y=y_synth)[0]
    min_r = min(len(rms_ref), len(rms_synth))
    if min_r > 1:
        env_corr = np.corrcoef(
            rms_ref[:min_r] / (np.max(rms_ref[:min_r]) + 1e-10),
            rms_synth[:min_r] / (np.max(rms_synth[:min_r]) + 1e-10)
        )[0, 1]
        scores['envelope'] = max(0, env_corr) * 100
    else:
        scores['envelope'] = 0.0

    # 4. Onset F1 — 15% (bipartite matching)
    ref_onsets = librosa.onset.onset_detect(y=y_ref, sr=sr, units='time')
    synth_onsets = librosa.onset.onset_detect(y=y_synth, sr=sr, units='time')
    used = set()
    matched = 0
    for r in ref_onsets:
        for j, s in enumerate(synth_onsets):
            if j not in used and abs(r - s) < 0.05:
                matched += 1
                used.add(j)
                break
    prec = matched / max(len(synth_onsets), 1)
    rec = matched / max(len(ref_onsets), 1)
    f1 = 2 * prec * rec / max(prec + rec, 1e-10)
    scores['attacks'] = f1 * 100

    # 5. Chroma DTW — 15%
    chroma_ref = librosa.feature.chroma_cqt(y=y_ref, sr=sr)
    chroma_synth = librosa.feature.chroma_cqt(y=y_synth, sr=sr)
    D_c, wp_c = librosa.sequence.dtw(X=chroma_ref, Y=chroma_synth, metric='cosine')
    scores['chroma'] = max(0, 1.0 - D_c[-1, -1] / max(len(wp_c), 1)) * 100

    weights = {'mfcc': 0.30, 'spectral': 0.20, 'envelope': 0.20, 'attacks': 0.15, 'chroma': 0.15}
    total = sum(scores[k] * weights[k] for k in weights)

    return {
        'total_score': round(total, 1),
        'breakdown': {k: round(v, 1) for k, v in scores.items()},
        'weights': weights,
        'lufs_normalized': lufs_normalized,
    }


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(f"Usage: python3 {sys.argv[0]} <reference.wav> <synthesized.wav> [output.json]", file=sys.stderr)
        sys.exit(1)

    ref = os.path.realpath(sys.argv[1])
    synth = os.path.realpath(sys.argv[2])

    # Path validation
    project_root = os.path.realpath(os.path.join(os.path.dirname(__file__), '..', '..'))
    for p in [ref, synth]:
        if not p.startswith(project_root):
            print(f"Error: path outside project root: {p}", file=sys.stderr)
            sys.exit(1)
        if not p.endswith(('.wav', '.flac')):
            print(f"Error: unsupported format (need .wav/.flac): {p}", file=sys.stderr)
            sys.exit(1)

    result = composite_similarity(ref, synth)

    if len(sys.argv) > 3:
        out_path = os.path.realpath(sys.argv[3])
        if not out_path.startswith(project_root):
            print(f"Error: output path outside project root", file=sys.stderr)
            sys.exit(1)
        os.makedirs(os.path.dirname(out_path) or '.', exist_ok=True)
        with open(out_path, 'w') as f:
            json.dump(result, f, indent=2)
        print(f"Calibration saved: {out_path}")
    else:
        print(json.dumps(result, indent=2))

    print(f"Score: {result['total_score']}/100")
