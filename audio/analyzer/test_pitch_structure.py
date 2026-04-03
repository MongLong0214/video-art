"""Pitch/structure hardening regression tests."""

import numpy as np

from analyze_track import detect_structure, pitch_to_note_events


def _make_audio(duration_sec, sr=22050, pattern="outro_then_drop"):
    n_samples = int(duration_sec * sr)
    t = np.linspace(0, duration_sec, n_samples, endpoint=False)

    if pattern == "outro_then_drop":
        env = np.zeros(n_samples, dtype=np.float32)
        a = int(n_samples * 0.25)
        b = int(n_samples * 0.80)
        c = int(n_samples * 0.86)
        env[:a] = 0.55          # build
        env[a:b] = 0.55         # drop-ish mid energy
        env[b:c] = 0.55         # would become outro without post-process
        env[c:] = 1.0           # strong ending that would become final drop
    else:
        env = np.ones(n_samples, dtype=np.float32) * 0.5

    audio = env * np.sin(2 * np.pi * 220 * t)
    return audio.astype(np.float32), sr


class TestPitchToNoteEvents:
    def test_flushes_final_sustained_note(self):
        pitch = np.full(20, 440.0, dtype=np.float32)
        confidence = np.full(20, 0.95, dtype=np.float32)

        events = pitch_to_note_events(pitch, confidence)

        assert len(events) == 1
        assert events[0]["freq"] == 440.0
        assert events[0]["duration"] > 0.4
        assert events[0]["slide"] is False


class TestStructureHardening:
    def test_outro_does_not_appear_before_final_segment(self):
        y, sr = _make_audio(120.0, pattern="outro_then_drop")
        result = detect_structure(y, sr)
        labels = [segment["label"] for segment in result["segments"]]

        assert labels, "Expected non-empty segment list"
        assert all(label != "outro" for label in labels[:-1]), (
            f"Found non-final outro in sequence: {labels}"
        )

    def test_adjacent_duplicate_labels_are_merged(self):
        y, sr = _make_audio(120.0, pattern="outro_then_drop")
        result = detect_structure(y, sr)
        labels = [segment["label"] for segment in result["segments"]]

        for idx in range(len(labels) - 1):
            assert labels[idx] != labels[idx + 1], (
                f"Adjacent duplicate labels were not merged: {labels}"
            )
