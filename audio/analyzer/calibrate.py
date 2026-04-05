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

    # Trim reference to match synthesis duration (T8: windowing fix)
    synth_dur = len(y_synth) / sr
    ref_dur = len(y_ref) / sr
    if ref_dur > synth_dur * 1.5:
        trim_samples = int(synth_dur * sr)
        y_ref_trimmed = y_ref[:trim_samples]
    else:
        y_ref_trimmed = y_ref

    scores = {}

    # 1. MFCC + DTW (timbral) — 30%
    mfcc_ref = librosa.feature.mfcc(y=y_ref_trimmed, sr=sr, n_mfcc=13)
    mfcc_synth = librosa.feature.mfcc(y=y_synth, sr=sr, n_mfcc=13)
    D, wp = librosa.sequence.dtw(X=mfcc_ref, Y=mfcc_synth, metric='cosine')
    scores['mfcc'] = max(0, 1.0 - D[-1, -1] / max(len(wp), 1)) * 100

    # 2. Band-weighted mean spectral distance (MSD) — 20%
    min_len = min(len(y_ref_trimmed), len(y_synth))
    S_ref = np.abs(librosa.stft(y_ref_trimmed[:min_len])) + 1e-10
    S_synth = np.abs(librosa.stft(y_synth[:min_len])) + 1e-10
    freqs = librosa.fft_frequencies(sr=sr)
    max_lsd = 20.0  # 20dB difference = 0 points

    band_scores = []
    band_weights = [(0, 250, 0.3), (250, 4000, 0.4), (4000, sr / 2, 0.3)]
    for lo, hi, w in band_weights:
        mask = (freqs >= lo) & (freqs < hi)
        if not np.any(mask):
            band_scores.append((w, 50.0))
            continue
        lsd = np.mean(np.abs(np.log10(S_ref[mask]) - np.log10(S_synth[mask])))
        band_score = max(0.0, (1.0 - lsd / max_lsd)) * 100
        band_scores.append((w, band_score))

    scores['spectral'] = sum(w * s for w, s in band_scores) / sum(w for w, _ in band_scores)

    # 3. RMS envelope correlation — 20%
    rms_ref = librosa.feature.rms(y=y_ref_trimmed)[0]
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

    # 4. Onset F1 — 15% (bipartite matching, T8: trimmed ref)
    ref_onsets = librosa.onset.onset_detect(y=y_ref_trimmed, sr=sr, units='time')
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

    # 5. Chroma DTW — 15% (T8: trimmed ref)
    chroma_ref = librosa.feature.chroma_cqt(y=y_ref_trimmed, sr=sr)
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


def per_stem_scores(ref_stems_dir, synth_stems_dir, sr=22050):
    """Per-stem comparison (AC-9.5). Returns scores for each stem type."""
    stem_types = ['drums', 'bass', 'vocals', 'other']
    results = {}
    for stem in stem_types:
        ref_path = os.path.join(ref_stems_dir, f'{stem}.wav')
        synth_path = os.path.join(synth_stems_dir, f'{stem}.wav')
        if os.path.exists(ref_path) and os.path.exists(synth_path):
            score = composite_similarity(ref_path, synth_path, sr=sr)
            results[stem] = {'score': score['total_score'], 'breakdown': score['breakdown']}
    return results


def dual_score(ref_path, synth_path, hybrid_path=None, ref_stems_dir=None,
               synth_stems_dir=None, sr=22050):
    """Dual-score calibration (AC-9.6). synthesis_only + hybrid + per-stem."""
    synthesis = composite_similarity(ref_path, synth_path, sr=sr)

    result = {
        'synthesis_only_score': synthesis['total_score'],
        'mode': 'synthesis_only',
        'breakdown': {
            'synthesis_only': synthesis['breakdown'],
        },
        'weights': synthesis['weights'],
        'lufs_normalized': synthesis.get('lufs_normalized', False),
    }

    if synthesis.get('warning'):
        result['warning'] = synthesis['warning']

    # Hybrid score if hybrid render available
    if hybrid_path and os.path.exists(hybrid_path):
        hybrid = composite_similarity(ref_path, hybrid_path, sr=sr)
        result['hybrid_score'] = hybrid['total_score']
        result['mode'] = 'hybrid'
        result['breakdown']['hybrid'] = hybrid['breakdown']

    # Per-stem scores if stems available
    if ref_stems_dir and synth_stems_dir:
        stems = per_stem_scores(ref_stems_dir, synth_stems_dir, sr=sr)
        if stems:
            result['breakdown']['per_stem'] = {}
            for stem, data in stems.items():
                result['breakdown']['per_stem'][stem] = {
                    'score': data['score'],
                }

    # Per-stem targets (AC-9.6)
    result['per_stem_targets'] = {
        'drums': 80, 'bass': 75, 'synth': 70,
    }

    # Quality label
    hybrid_s = result.get('hybrid_score', result['synthesis_only_score'])
    if hybrid_s >= 75:
        result['quality'] = 'Production Ready'
    elif hybrid_s >= 65:
        result['quality'] = 'Good'
    else:
        result['quality'] = 'Needs Work'

    return result


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description='Calibrate synthesis vs reference')
    parser.add_argument('reference', help='Reference WAV/FLAC path')
    parser.add_argument('synthesized', help='Synthesized WAV/FLAC path')
    parser.add_argument('--hybrid', help='Hybrid render WAV path', default=None)
    parser.add_argument('--ref-stems', help='Reference stems directory', default=None)
    parser.add_argument('--synth-stems', help='Synthesized stems directory', default=None)
    parser.add_argument('--output', '-o', help='Output JSON path', default=None)
    args = parser.parse_args()

    project_root = os.path.realpath(os.path.join(os.path.dirname(__file__), '..', '..'))

    # Path validation
    paths_to_check = [os.path.realpath(args.reference), os.path.realpath(args.synthesized)]
    if args.hybrid:
        paths_to_check.append(os.path.realpath(args.hybrid))
    for p in paths_to_check:
        if not p.startswith(project_root):
            print(f"Error: path outside project root: {p}", file=sys.stderr)
            sys.exit(1)
        if not p.endswith(('.wav', '.flac')):
            print(f"Error: unsupported format (need .wav/.flac): {p}", file=sys.stderr)
            sys.exit(1)

    result = dual_score(
        os.path.realpath(args.reference),
        os.path.realpath(args.synthesized),
        hybrid_path=os.path.realpath(args.hybrid) if args.hybrid else None,
        ref_stems_dir=os.path.realpath(args.ref_stems) if args.ref_stems else None,
        synth_stems_dir=os.path.realpath(args.synth_stems) if args.synth_stems else None,
    )

    # AC-9.4: default save path = out/analysis/{filename}/calibration.json
    if args.output:
        out_path = os.path.realpath(args.output)
    else:
        # Derive from synthesized file path
        synth_dir = os.path.dirname(os.path.realpath(args.synthesized))
        out_path = os.path.join(synth_dir, 'calibration.json')

    if not out_path.startswith(project_root):
        print(f"Error: output path outside project root", file=sys.stderr)
        sys.exit(1)
    os.makedirs(os.path.dirname(out_path) or '.', exist_ok=True)
    with open(out_path, 'w') as f:
        json.dump(result, f, indent=2)
    print(f"Calibration saved: {out_path}")

    print(f"Synthesis: {result['synthesis_only_score']}/100", end='')
    if 'hybrid_score' in result:
        print(f" | Hybrid: {result['hybrid_score']}/100", end='')
    print(f" | {result['quality']}")
