"""Smoke tests for chromatic 303 sample generator."""

import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

import generate  # noqa: E402


def test_chromatic_note_range():
    notes = generate.get_chromatic_notes()
    assert notes[0][0] == "C1"
    assert notes[-1][0] == "C5"
    assert len(notes) == 49


def test_manifest_schema_exists():
    assert (ROOT / "manifest.schema.json").exists()


def test_generate_303_note_returns_audio():
    audio = generate.generate_303_note(
        generate.midi_to_freq(48),
        waveform="saw",
        **generate.ARTICULATION_SPECS["normal"],
    )
    assert audio.ndim == 1
    assert len(audio) > 1000


def test_generate_percussive_sample_returns_audio():
    audio = generate.generate_percussive_sample("click", 0.05, 1)
    assert audio.ndim == 1
    assert len(audio) > 100


def test_percussion_variants_have_rr_metadata():
    assert generate.PERCUSSION_VARIANTS["click"]["count"] >= 2
    assert "pseudo_hat" in generate.PERCUSSION_VARIANTS["hat_short"]["role_tags"]
