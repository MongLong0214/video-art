#!/usr/bin/env python3
"""Hybrid track analyzer — librosa (HPSS/spectral) + essentia (Key/BPM/Loudness/Danceability)."""

import sys
import os
import json
import warnings as _warnings

if sys.version_info < (3, 9):
    print(f"Error: Python 3.9+ required (current: {sys.version})", file=sys.stderr)
    sys.exit(1)

import numpy as np
import librosa
import soundfile as sf

try:
    import essentia.standard as es
    HAS_ESSENTIA = True
except ImportError:
    HAS_ESSENTIA = False

_warnings.filterwarnings("ignore", category=FutureWarning)
_warnings.filterwarnings("ignore", category=UserWarning)

ANALYSIS_FIELDS = [
    "bpm", "key", "spectral_centroid", "spectral_bandwidth", "spectral_rolloff",
    "energy_curve", "onset_density", "frequency_balance", "dynamic_range",
    "stereo_width", "kick_pattern", "hat_pattern", "bass_profile",
    "structure", "loudness", "mfcc", "spectral_contrast", "danceability",
    "pitch_contour",
]


# === essentia-powered analyzers ===

def detect_bpm_essentia(audio_es):
    """BPM via essentia RhythmExtractor2013."""
    try:
        rhythm = es.RhythmExtractor2013(method="multifeature")
        bpm, ticks, confidence, _, _ = rhythm(audio_es)
        return float(bpm), float(confidence)
    except Exception:
        return None, 0.0


def detect_key_essentia(audio_es):
    """Key via essentia KeyExtractor — replaces manual Krumhansl."""
    try:
        key_ext = es.KeyExtractor()
        key, scale, strength = key_ext(audio_es)
        suffix = "m" if scale == "minor" else ""
        return f"{key}{suffix}"
    except Exception:
        return None


def analyze_loudness_essentia(audio_stereo, sr):
    """EBU R128 loudness via essentia."""
    try:
        loud = es.LoudnessEBUR128(sampleRate=float(sr))
        momentary, short_term, integrated, loudness_range = loud(audio_stereo)
        return {
            "integrated": round(float(integrated), 1),
            "range": round(float(loudness_range), 1),
            "short_term_max": round(float(np.max(short_term)) if len(short_term) > 0 else 0, 1),
        }
    except Exception:
        return None


def analyze_danceability_essentia(audio_es):
    """Danceability via essentia DZC algorithm."""
    try:
        dance = es.Danceability()
        score, dfa = dance(audio_es)
        return {"score": round(float(score), 3)}
    except Exception:
        return None


# === librosa-powered analyzers ===

def detect_bpm_librosa(y_perc, sr):
    """BPM via librosa beat_track + tempogram."""
    try:
        tempo_bt, _ = librosa.beat.beat_track(y=y_perc, sr=sr)
        bt_bpm = float(np.atleast_1d(tempo_bt)[0])

        oenv = librosa.onset.onset_strength(y=y_perc, sr=sr)
        tempo_tg = librosa.feature.tempo(onset_envelope=oenv, sr=sr, aggregate=None)
        tg_bpm = float(np.median(tempo_tg))

        return bt_bpm, tg_bpm
    except Exception:
        return None, None


def cross_validate_bpm(es_bpm, es_conf, lr_bt, lr_tg):
    """2-way cross-validation: essentia + librosa. Half/double correction + genre range."""
    candidates = set()
    sources = [b for b in [es_bpm, lr_bt, lr_tg] if b is not None and b > 0]

    for base in sources:
        for mult in [0.5, 1.0, 2.0]:
            c = base * mult
            if 60 <= c <= 200:
                candidates.add(round(c, 2))

    if not candidates:
        candidates = {round(sources[0], 2)} if sources else {120.0}

    # Prefer genre-typical ranges
    genre_ranges = [(135, 150), (125, 140), (120, 135), (140, 170)]
    best = None
    for lo, hi in genre_ranges:
        in_range = [c for c in candidates if lo <= c <= hi]
        if in_range:
            best = min(in_range, key=lambda x: abs(x - (lo + hi) / 2))
            break

    if best is None:
        best = min(candidates, key=lambda x: abs(x - 130))

    # Confidence: essentia confidence + agreement check
    if es_bpm and lr_bt:
        agreement = abs(es_bpm - lr_bt) / max(es_bpm, 1)
        conf = min(1.0, (es_conf or 0.5) * (1.0 if agreement < 0.03 else 0.7))
    else:
        conf = es_conf or 0.5

    return {"value": round(best, 1), "confidence": round(conf, 2)}


def analyze_spectral(y_mono, sr):
    try:
        centroid = librosa.feature.spectral_centroid(y=y_mono, sr=sr)[0]
        bandwidth = librosa.feature.spectral_bandwidth(y=y_mono, sr=sr)[0]
        rolloff = librosa.feature.spectral_rolloff(y=y_mono, sr=sr)[0]
        return {
            "centroid": {"mean": round(float(np.mean(centroid)), 1),
                         "max": round(float(np.max(centroid)), 1),
                         "min": round(float(np.min(centroid)), 1)},
            "bandwidth": round(float(np.mean(bandwidth)), 1),
            "rolloff": round(float(np.mean(rolloff)), 1),
        }
    except Exception:
        return None


def analyze_energy(y_mono, sr):
    try:
        rms = librosa.feature.rms(y=y_mono)[0]
        if len(rms) > 100:
            indices = np.linspace(0, len(rms) - 1, 100, dtype=int)
            rms = rms[indices]
        return [round(float(v), 4) for v in rms]
    except Exception:
        return None


def analyze_onsets(y_mono, sr):
    try:
        onsets = librosa.onset.onset_detect(y=y_mono, sr=sr, units="time")
        duration = librosa.get_duration(y=y_mono, sr=sr)
        return round(len(onsets) / max(duration, 0.001), 2)
    except Exception:
        return None


def analyze_freq_balance(y_mono, sr):
    try:
        S = np.abs(librosa.stft(y_mono))
        freqs = librosa.fft_frequencies(sr=sr)
        low_e = float(np.sum(S[freqs < 300, :] ** 2))
        mid_e = float(np.sum(S[(freqs >= 300) & (freqs < 4000), :] ** 2))
        hi_e = float(np.sum(S[freqs >= 4000, :] ** 2))
        total = low_e + mid_e + hi_e + 1e-10
        return {"low": round(low_e / total, 3), "mid": round(mid_e / total, 3), "hi": round(hi_e / total, 3)}
    except Exception:
        return None


def analyze_dynamics(y_mono, sr):
    try:
        rms = librosa.feature.rms(y=y_mono)[0]
        peak = float(np.max(np.abs(y_mono)))
        rms_mean = float(np.mean(rms))
        return {"crest": round(peak / max(rms_mean, 1e-10), 2),
                "rms_mean": round(rms_mean, 4), "rms_max": round(float(np.max(rms)), 4)}
    except Exception:
        return None


def analyze_stereo(y, sr):
    try:
        if y.ndim < 2 or y.shape[0] < 2:
            return 0.0
        mid = (y[0] + y[1]) / 2
        side = (y[0] - y[1]) / 2
        return round(min(float(np.sqrt(np.mean(side ** 2))) / max(float(np.sqrt(np.mean(mid ** 2))), 1e-10), 1.0), 3)
    except Exception:
        return 0.0


def detect_kick_pattern(y_perc, sr):
    try:
        S = np.abs(librosa.stft(y_perc))
        freqs = librosa.fft_frequencies(sr=sr)
        S_kick = np.zeros_like(S)
        S_kick[(freqs >= 40) & (freqs <= 120), :] = S[(freqs >= 40) & (freqs <= 120), :]
        y_kick = librosa.istft(S_kick)
        onsets = librosa.onset.onset_detect(y=y_kick, sr=sr, units="time")
        return {"positions": [round(float(t), 3) for t in onsets]}
    except Exception:
        return {"positions": []}


def detect_hat_pattern(y_perc, sr):
    try:
        S = np.abs(librosa.stft(y_perc))
        freqs = librosa.fft_frequencies(sr=sr)
        S_hat = np.zeros_like(S)
        S_hat[freqs >= 8000, :] = S[freqs >= 8000, :]
        y_hat = librosa.istft(S_hat)
        onsets = librosa.onset.onset_detect(y=y_hat, sr=sr, units="time")
        return {"positions": [round(float(t), 3) for t in onsets]}
    except Exception:
        return {"positions": []}


def analyze_bass(y_mono, sr):
    try:
        S = np.abs(librosa.stft(y_mono))
        freqs = librosa.fft_frequencies(sr=sr)
        S_bass = S[freqs < 500, :]
        if S_bass.size == 0:
            return {"centroid": 0, "variance": 0, "flux": 0, "type": "sub"}

        bass_freqs = freqs[freqs < 500]
        power = S_bass ** 2
        centroid = float(np.sum(bass_freqs[:, None] * power) / max(np.sum(power), 1e-10))

        frame_centroids = []
        for i in range(S_bass.shape[1]):
            col_power = S_bass[:, i] ** 2
            total = np.sum(col_power)
            if total > 1e-10:
                frame_centroids.append(float(np.sum(bass_freqs * col_power) / total))
        variance = float(np.var(frame_centroids)) if frame_centroids else 0.0

        diff = np.diff(S_bass, axis=1)
        flux = float(np.mean(np.sqrt(np.mean(diff ** 2, axis=0))))

        if flux > 0.3 and centroid > 200:
            bass_type = "acid"
        elif centroid < 150 and variance < 50 and flux < 0.2:
            bass_type = "sub"
        else:
            bass_type = "rolling"

        return {"centroid": round(centroid, 1), "variance": round(variance, 1),
                "flux": round(flux, 4), "type": bass_type}
    except Exception:
        return None


def detect_structure(y_mono, sr):
    MIN_SECTION_SEC = 5.0
    MIN_SECTION_SEC_SHORT = 2.0
    OUTRO_MAX_RATIO = 0.5

    try:
        duration = librosa.get_duration(y=y_mono, sr=sr)
        if duration < 1.0:
            return {"segments": [{"start": 0.0, "end": round(duration, 2), "label": "drop"}]}

        is_short = duration < 30.0
        min_sec = MIN_SECTION_SEC_SHORT if is_short else MIN_SECTION_SEC

        # Energy curve: 100-point normalized RMS
        rms = librosa.feature.rms(y=y_mono)[0]
        n_points = 100
        chunk = max(1, len(rms) // n_points)
        energy = np.array([np.mean(rms[i*chunk:(i+1)*chunk]) for i in range(n_points)])
        peak = np.max(energy)

        # Silence → single drop
        if peak < 1e-6:
            return {"segments": [{"start": 0.0, "end": round(duration, 2), "label": "drop"}]}

        energy = energy / peak  # normalize 0-1

        # Label each point by energy level
        labels_map = []
        avg = np.mean(energy)
        for i, e in enumerate(energy):
            pos = i / n_points
            if e < avg * 0.5:
                labels_map.append("intro" if pos < 0.3 else "break")
            elif e > avg * 1.2:
                labels_map.append("drop")
            else:
                if pos < 0.25:
                    labels_map.append("build")
                elif pos > 0.8:
                    labels_map.append("outro")
                else:
                    labels_map.append("build" if pos < 0.5 else "drop")

        # Merge consecutive same-label regions into segments
        raw_segments = []
        prev_label = labels_map[0]
        seg_start = 0.0
        for i in range(1, n_points):
            if labels_map[i] != prev_label:
                seg_end = round((i / n_points) * duration, 2)
                raw_segments.append({"start": seg_start, "end": seg_end, "label": prev_label})
                seg_start = seg_end
                prev_label = labels_map[i]
        raw_segments.append({"start": seg_start, "end": round(duration, 2), "label": prev_label})

        # Merge short segments into neighbors
        segments = []
        for seg in raw_segments:
            seg_dur = seg["end"] - seg["start"]
            if seg_dur < min_sec and segments:
                segments[-1]["end"] = seg["end"]
            else:
                segments.append(dict(seg))

        # If last segment is too short, merge into previous
        if len(segments) > 1:
            last_dur = segments[-1]["end"] - segments[-1]["start"]
            if last_dur < min_sec:
                segments[-2]["end"] = segments[-1]["end"]
                segments.pop()

        # Outro cap: if outro > 50%, split into break + outro
        outro_segs = [s for s in segments if s["label"] == "outro"]
        if outro_segs:
            outro_dur = sum(s["end"] - s["start"] for s in outro_segs)
            if outro_dur / duration > OUTRO_MAX_RATIO:
                new_segments = []
                for s in segments:
                    if s["label"] == "outro":
                        s_dur = s["end"] - s["start"]
                        if s_dur > min_sec * 2:
                            mid = round(s["start"] + s_dur * 0.5, 2)
                            new_segments.append({"start": s["start"], "end": mid, "label": "break"})
                            new_segments.append({"start": mid, "end": s["end"], "label": "outro"})
                        else:
                            new_segments.append(s)
                    else:
                        new_segments.append(s)
                segments = new_segments

        # Ensure minimum 4 segments for long tracks (>= 60s)
        if not is_short and len(segments) < 4:
            # Equal split with standard labels
            labels_seq = ["intro", "build", "drop", "outro"]
            seg_dur = duration / 4
            segments = [
                {"start": round(i * seg_dur, 2), "end": round((i + 1) * seg_dur, 2), "label": labels_seq[i]}
                for i in range(4)
            ]
            segments[-1]["end"] = round(duration, 2)

        # Ensure minimum 2 segments for short tracks
        if is_short and len(segments) < 2:
            mid = round(duration * 0.4, 2)
            segments = [
                {"start": 0.0, "end": mid, "label": "intro"},
                {"start": mid, "end": round(duration, 2), "label": "drop"},
            ]

        if not segments:
            segments = [{"start": 0.0, "end": round(duration, 2), "label": "drop"}]

        return {"segments": segments}
    except Exception:
        return {"segments": []}


def analyze_mfcc(y_mono, sr):
    try:
        mfcc = librosa.feature.mfcc(y=y_mono, sr=sr, n_mfcc=13)
        return {"mean": [round(float(v), 3) for v in np.mean(mfcc, axis=1)],
                "std": [round(float(v), 3) for v in np.std(mfcc, axis=1)]}
    except Exception:
        return None


def analyze_spectral_contrast(y_mono, sr):
    try:
        contrast = librosa.feature.spectral_contrast(y=y_mono, sr=sr)
        return {"mean": [round(float(v), 2) for v in np.mean(contrast, axis=1)],
                "std": [round(float(v), 2) for v in np.std(contrast, axis=1)]}
    except Exception:
        return None


# === demucs source separation (T3) ===

def has_demucs():
    """Check if demucs is installed."""
    try:
        import demucs  # noqa: F401
        return True
    except ImportError:
        return False


def check_disk_space(output_dir, file_size):
    """Check 2x safety margin before demucs."""
    try:
        import shutil
        stat = shutil.disk_usage(os.path.dirname(output_dir) or ".")
        required = file_size * 2
        return stat.free > required
    except Exception:
        return True  # proceed if can't check


def separate_stems(file_path, output_dir):
    """Run demucs separation → 4 stem WAVs."""
    import subprocess
    import shutil
    stems_dir = os.path.join(output_dir, "stems")
    result = subprocess.run(
        ["python3", "-m", "demucs", "--out", stems_dir, file_path],
        capture_output=True, text=True, timeout=900,
    )
    if result.returncode != 0:
        raise RuntimeError(f"demucs failed: {result.stderr[:200]}")

    # Find output directory (demucs creates nested subdirs: stems/htdemucs/trackname/*.wav)
    # Walk all subdirectories to find the actual stem WAVs
    for root, dirs, files in os.walk(stems_dir):
        if root == stems_dir:
            continue
        for f in files:
            if f.endswith(".wav"):
                src = os.path.join(root, f)
                dst = os.path.join(stems_dir, f)
                if os.path.exists(dst):
                    raise RuntimeError(f"Stem collision: {dst} already exists; multiple model outputs?")
                shutil.move(src, dst)

    return stems_dir


def analyze_stem(stem_path, sr, stem_type):
    """Per-stem subset analysis."""
    try:
        y_stem, stem_sr = librosa.load(stem_path, sr=sr, mono=True)
    except Exception:
        return None

    if stem_type == "drums":
        y_harm, y_perc = librosa.effects.hpss(y_stem)
        return {
            "onset_density": analyze_onsets(y_stem, stem_sr),
            "kick_pattern": detect_kick_pattern(y_perc, stem_sr),
            "hat_pattern": detect_hat_pattern(y_perc, stem_sr),
        }
    elif stem_type == "bass":
        bass = analyze_bass(y_stem, stem_sr)
        return {
            "spectral_centroid": float(np.mean(librosa.feature.spectral_centroid(y=y_stem, sr=stem_sr)[0])),
            "centroid_variance": bass["variance"] if bass else 0,
            "bass_type": bass["type"] if bass else "rolling",
        }
    elif stem_type == "vocals":
        dyn = analyze_dynamics(y_stem, stem_sr)
        return {"dynamic_range": dyn}
    elif stem_type == "other":
        return {
            "spectral_centroid": float(np.mean(librosa.feature.spectral_centroid(y=y_stem, sr=stem_sr)[0])),
            "stereo_width": 0.0,  # mono stem
        }
    return None


def extract_pitch_contour(audio_path, sr=22050):
    """3-tier pitch extraction: torchcrepe → PESTO → pyin."""
    tracker_used = None

    # Tier 1: torchcrepe (Viterbi 303 glide capture)
    try:
        import torchcrepe
        import torch
        audio, sr_loaded = torchcrepe.load.audio(audio_path)
        # Force mono (stereo stems cause squeeze error)
        if audio.dim() > 1 and audio.shape[0] > 1:
            audio = audio.mean(dim=0, keepdim=True)
        hop_length = int(sr_loaded / 200)
        pitch, periodicity = torchcrepe.predict(
            audio, sr_loaded, hop_length,
            fmin=30, fmax=1000, model='full', device='cpu',
            batch_size=256, return_periodicity=True,
            decoder=torchcrepe.decode.viterbi,
        )
        periodicity = torchcrepe.filter.median(periodicity, win_length=3)
        pitch = torchcrepe.threshold.At(0.21)(pitch, periodicity)
        pitch = torchcrepe.filter.mean(pitch, win_length=3)
        return pitch.numpy().flatten(), periodicity.numpy().flatten(), 'torchcrepe'
    except ImportError:
        pass

    # Tier 2: PESTO (120KB, 12x realtime)
    try:
        import pesto
        import torchaudio
        audio, sr_loaded = torchaudio.load(audio_path)
        timesteps, pitch, confidence, _ = pesto.predict(audio, sr_loaded)
        return pitch.numpy().flatten(), confidence.numpy().flatten(), 'pesto'
    except ImportError:
        pass

    # Tier 3: pyin (librosa built-in, no dependency)
    try:
        audio, sr_loaded = librosa.load(audio_path, sr=sr, mono=True)
        f0, voiced_flag, voiced_probs = librosa.pyin(
            audio, fmin=30, fmax=1047, sr=sr,
            frame_length=2048, hop_length=512,
        )
        return f0, voiced_probs, 'pyin'
    except Exception:
        return None, None, None


def pitch_to_note_events(pitch, confidence, sr=22050, hop_length=512,
                         conf_threshold=0.5, note_threshold=1.5, min_slide_dur=0.02):
    """Frame-continuity slide detection. slide=True when pitch transitions gradually."""
    if pitch is None:
        return []

    def semitone_diff(f1, f2):
        if f1 <= 0 or f2 <= 0:
            return float('inf')
        return abs(12 * np.log2(f1 / f2))

    min_slide_frames = max(2, int(min_slide_dur * sr / hop_length))
    events = []
    current_note = None
    note_start = 0
    transition_frames = 0
    prev_freq = 0

    for i, (freq, conf) in enumerate(zip(pitch, confidence)):
        time = i * hop_length / sr
        is_voiced = (conf is not None and conf > conf_threshold
                     and freq is not None and freq > 0
                     and not np.isnan(freq))

        if is_voiced:
            if current_note is None:
                current_note = freq
                prev_freq = freq
                note_start = time
                transition_frames = 0
            else:
                total_drift = semitone_diff(freq, current_note)
                frame_delta = semitone_diff(freq, prev_freq)
                if total_drift > note_threshold:
                    is_slide = transition_frames >= min_slide_frames
                    events.append({
                        "time": round(note_start, 3),
                        "freq": round(float(current_note), 1),
                        "duration": round(time - note_start, 3),
                        "velocity": round(float(np.nanmean(confidence[max(0,i-5):max(i,1)])), 2),
                        "slide": is_slide,
                    })
                    current_note = freq
                    note_start = time
                    transition_frames = 0
                elif frame_delta > 0.1:
                    transition_frames += 1
                prev_freq = freq
        elif current_note is not None:
            events.append({
                "time": round(note_start, 3),
                "freq": round(float(current_note), 1),
                "duration": round(time - note_start, 3),
                "velocity": round(float(np.nanmean(confidence[max(0,i-5):max(i,1)])), 2),
                "slide": transition_frames >= min_slide_frames,
            })
            current_note = None
            transition_frames = 0

    return events


def run_demucs_pipeline(file_path, output_dir, sr, warnings_list):
    """Full demucs pipeline: separate + per-stem analysis."""
    if not has_demucs():
        warnings_list.append("demucs not installed — stem separation skipped")
        return None

    file_size = os.path.getsize(file_path)
    if not check_disk_space(output_dir, file_size):
        warnings_list.append("Insufficient disk space for demucs (need 2x file size)")
        return None

    try:
        stems_dir = separate_stems(file_path, output_dir)
    except Exception as e:
        warnings_list.append(f"demucs separation failed: {e}")
        return None

    # Verify 4 stem files
    stem_names = ["drums", "bass", "vocals", "other"]
    stems_result = {}
    for name in stem_names:
        stem_path = os.path.join(stems_dir, f"{name}.wav")
        if os.path.exists(stem_path):
            stems_result[name] = analyze_stem(stem_path, sr, name)
        else:
            warnings_list.append(f"Stem file missing: {name}.wav")
            stems_result[name] = None

    return stems_result


# === Main pipeline ===

def analyze(file_path, output_dir):
    """Hybrid analysis: librosa (HPSS/spectral) + essentia (Key/BPM/Loudness/Danceability)."""
    warn = []

    # 1. Single load via librosa (shared with essentia as numpy array)
    y, sr = librosa.load(file_path, sr=None, mono=False)
    y_mono = librosa.to_mono(y) if y.ndim > 1 else y

    duration = librosa.get_duration(y=y_mono, sr=sr)
    if duration > 600:
        warn.append(f"Long file ({duration:.0f}s) — may use significant memory")

    # HPSS for kick/hat/key (librosa-specific)
    y_harm, y_perc = librosa.effects.hpss(y_mono)

    # 2. Prepare essentia input (float32 numpy — no re-load)
    audio_es = y_mono.astype(np.float32)

    # Stereo for EBU R128
    if y.ndim > 1 and y.shape[0] >= 2:
        audio_stereo = y.T.astype(np.float32)
    else:
        audio_stereo = np.column_stack([audio_es, audio_es]).astype(np.float32)

    results = {}

    def safe(name, func, *args):
        try:
            results[name] = func(*args)
        except Exception as e:
            results[name] = None
            warn.append(f"{name}: {e}")

    # 3. essentia: BPM, Key, Loudness, Danceability
    if HAS_ESSENTIA:
        es_bpm, es_conf = detect_bpm_essentia(audio_es)
        results["key"] = detect_key_essentia(audio_es)
        safe("loudness", analyze_loudness_essentia, audio_stereo, sr)
        safe("danceability", analyze_danceability_essentia, audio_es)
    else:
        es_bpm, es_conf = None, 0.0
        results["key"] = None
        results["loudness"] = None
        results["danceability"] = None
        warn.append("essentia not installed — Key/Loudness/Danceability unavailable")

    # 4. librosa: BPM (cross-validation)
    lr_bt, lr_tg = detect_bpm_librosa(y_perc, sr)
    results["bpm"] = cross_validate_bpm(es_bpm, es_conf, lr_bt, lr_tg)

    # 5. librosa: spectral + HPSS-dependent
    spectral = analyze_spectral(y_mono, sr)
    results["spectral_centroid"] = spectral["centroid"] if spectral else None
    results["spectral_bandwidth"] = spectral["bandwidth"] if spectral else None
    results["spectral_rolloff"] = spectral["rolloff"] if spectral else None
    if spectral is None:
        warn.append("spectral analysis failed")

    safe("energy_curve", analyze_energy, y_mono, sr)
    safe("onset_density", analyze_onsets, y_mono, sr)
    safe("frequency_balance", analyze_freq_balance, y_mono, sr)
    safe("dynamic_range", analyze_dynamics, y_mono, sr)
    safe("stereo_width", analyze_stereo, y, sr)
    safe("kick_pattern", detect_kick_pattern, y_perc, sr)
    safe("hat_pattern", detect_hat_pattern, y_perc, sr)
    safe("bass_profile", analyze_bass, y_mono, sr)
    safe("structure", detect_structure, y_mono, sr)
    safe("mfcc", analyze_mfcc, y_mono, sr)
    safe("spectral_contrast", analyze_spectral_contrast, y_mono, sr)

    # 6. Pitch contour (Phase 2 — 3-tier fallback)
    try:
        pitch_f0, pitch_conf, tracker = extract_pitch_contour(file_path, sr)
        if pitch_f0 is not None:
            note_events = pitch_to_note_events(pitch_f0, pitch_conf, sr)
            results["pitch_contour"] = {
                "tracker_used": tracker,
                "note_events": note_events,
                "frame_count": len(pitch_f0),
            }
        else:
            results["pitch_contour"] = None
            warn.append("pitch tracking: all 3 tiers unavailable — skipped")
    except Exception as e:
        results["pitch_contour"] = None
        warn.append(f"pitch tracking: {e}")

    # 7. demucs stems (T3 — optional)
    stems = run_demucs_pipeline(file_path, output_dir, sr, warn)
    if stems is not None:
        results["stems"] = stems

    results["warnings"] = warn

    # Verify completeness
    missing = [f for f in ANALYSIS_FIELDS if f not in results]
    if missing:
        warn.append(f"Missing fields: {missing}")

    # Write
    os.makedirs(output_dir, exist_ok=True)
    out_path = os.path.join(output_dir, "analysis.json")
    with open(out_path, "w") as f:
        json.dump(results, f, indent=2, default=str)

    print(f"Analysis complete: {out_path}")
    print(f"  BPM: {results.get('bpm')}")
    print(f"  Key: {results.get('key')}")
    print(f"  Loudness: {results.get('loudness')}")
    print(f"  Danceability: {results.get('danceability')}")
    print(f"  Warnings: {len(warn)}")
    return results


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(f"Usage: python3 {sys.argv[0]} <audio_file> <output_dir>", file=sys.stderr)
        sys.exit(1)

    # Path validation
    project_root = os.path.realpath(os.path.join(os.path.dirname(__file__), '..', '..'))
    file_path = os.path.realpath(sys.argv[1])
    out_dir = os.path.realpath(sys.argv[2])
    for p, label in [(file_path, "input"), (out_dir, "output")]:
        if not p.startswith(project_root):
            print(f"Error: {label} path outside project root", file=sys.stderr)
            sys.exit(1)

    if not os.path.exists(file_path):
        print(f"Error: File not found: {file_path}", file=sys.stderr)
        sys.exit(1)

    analyze(file_path, out_dir)
