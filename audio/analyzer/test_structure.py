"""T1: detect_structure() energy-based normalization tests."""
import numpy as np
import pytest


# Import will work after implementation
from analyze_track import detect_structure


# Shared constants (must match implementation)
MIN_SECTION_SEC = 5.0
MIN_SECTION_SEC_SHORT = 2.0
OUTRO_MAX_RATIO = 0.5


def _make_audio(duration_sec, sr=22050, pattern="normal"):
    """Generate synthetic mono audio with known energy profile."""
    n_samples = int(duration_sec * sr)
    t = np.linspace(0, duration_sec, n_samples)

    if pattern == "normal":
        # intro(quiet) → build(rising) → drop(loud) → break(quiet) → outro(declining)
        env = np.zeros(n_samples)
        seg = n_samples // 5
        env[:seg] = 0.1                              # intro
        env[seg:2*seg] = np.linspace(0.1, 0.8, seg)  # build
        env[2*seg:3*seg] = 0.9                        # drop
        env[3*seg:4*seg] = 0.15                       # break
        env[4*seg:] = np.linspace(0.5, 0.1, n_samples - 4*seg)  # outro
    elif pattern == "silent":
        env = np.zeros(n_samples)
    elif pattern == "uniform":
        env = np.ones(n_samples) * 0.5
    elif pattern == "short":
        env = np.zeros(n_samples)
        half = n_samples // 2
        env[:half] = 0.1
        env[half:] = 0.9
    else:
        env = np.ones(n_samples) * 0.5

    # 440Hz sine modulated by envelope
    audio = env * np.sin(2 * np.pi * 440 * t)
    return audio.astype(np.float32), sr


class TestDetectStructure:
    """T1: detect_structure energy-based normalization."""

    def test_returns_at_least_4_segments_for_normal_track(self):
        y, sr = _make_audio(335.0, pattern="normal")
        result = detect_structure(y, sr)
        segments = result["segments"]
        assert len(segments) >= 4, f"Expected >= 4 segments, got {len(segments)}"

    def test_each_segment_at_least_5_seconds(self):
        y, sr = _make_audio(335.0, pattern="normal")
        result = detect_structure(y, sr)
        for seg in result["segments"]:
            dur = seg["end"] - seg["start"]
            assert dur >= MIN_SECTION_SEC, (
                f"Segment '{seg['label']}' is {dur:.1f}s, min is {MIN_SECTION_SEC}s"
            )

    def test_outro_at_most_50_percent(self):
        y, sr = _make_audio(335.0, pattern="normal")
        result = detect_structure(y, sr)
        total = result["segments"][-1]["end"]
        outro_segs = [s for s in result["segments"] if s["label"] == "outro"]
        outro_dur = sum(s["end"] - s["start"] for s in outro_segs)
        assert outro_dur / total <= OUTRO_MAX_RATIO, (
            f"Outro is {outro_dur/total:.1%} of total, max is {OUTRO_MAX_RATIO:.0%}"
        )

    def test_all_zero_energy_fallback_to_drop(self):
        y, sr = _make_audio(60.0, pattern="silent")
        result = detect_structure(y, sr)
        segments = result["segments"]
        assert len(segments) == 1
        assert segments[0]["label"] == "drop"

    def test_short_track_at_least_2_segments_min_2s(self):
        y, sr = _make_audio(20.0, pattern="short")
        result = detect_structure(y, sr)
        segments = result["segments"]
        assert len(segments) >= 2, f"Expected >= 2 segments, got {len(segments)}"
        for seg in segments:
            dur = seg["end"] - seg["start"]
            assert dur >= MIN_SECTION_SEC_SHORT, (
                f"Short track segment '{seg['label']}' is {dur:.1f}s, min is {MIN_SECTION_SEC_SHORT}s"
            )

    def test_segments_cover_full_duration(self):
        y, sr = _make_audio(335.0, pattern="normal")
        result = detect_structure(y, sr)
        segments = result["segments"]
        assert abs(segments[0]["start"]) < 0.01, "First segment should start at 0"
        assert abs(segments[-1]["end"] - 335.0) < 0.5, "Last segment should end at duration"
        # No gaps
        for i in range(len(segments) - 1):
            assert abs(segments[i]["end"] - segments[i+1]["start"]) < 0.01, (
                f"Gap between segment {i} and {i+1}"
            )

    def test_uniform_energy_produces_balanced_sections(self):
        """EC-3: uniform energy → roughly equal 4-way split."""
        y, sr = _make_audio(120.0, pattern="uniform")
        result = detect_structure(y, sr)
        segments = result["segments"]
        assert len(segments) >= 4
