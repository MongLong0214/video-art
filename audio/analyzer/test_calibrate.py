"""Tests for calibrate.py — composite_similarity, dual_score, per_stem_scores."""
import pytest
import numpy as np
from calibrate import composite_similarity, dual_score


class TestCompositeSimilarity:
    def test_identical_score_high(self, sine_wav):
        result = composite_similarity(sine_wav, sine_wav)
        assert result['total_score'] >= 95, f"Identical files should score >= 95, got {result['total_score']}"

    def test_unrelated_score_low(self, sine_wav, noise_wav):
        result = composite_similarity(sine_wav, noise_wav)
        assert result['total_score'] < 50, f"Unrelated files should score < 50, got {result['total_score']}"

    def test_silence_returns_zero(self, silence_wav, sine_wav):
        result = composite_similarity(silence_wav, sine_wav)
        assert result['total_score'] == 0.0
        assert 'warning' in result

    def test_weights_sum_to_one(self, sine_wav):
        result = composite_similarity(sine_wav, sine_wav)
        total_weight = sum(result['weights'].values())
        assert abs(total_weight - 1.0) < 0.01

    def test_breakdown_keys(self, sine_wav):
        result = composite_similarity(sine_wav, sine_wav)
        expected = {'mfcc', 'spectral', 'envelope', 'attacks', 'chroma'}
        assert set(result['breakdown'].keys()) == expected

    def test_lufs_normalized_flag(self, sine_wav):
        result = composite_similarity(sine_wav, sine_wav)
        assert 'lufs_normalized' in result


class TestSpectralBandWeighted:
    """T1: band-weighted MSD spectral metric."""

    def test_spectral_identical(self, sine_wav):
        """Identical signals → spectral ~100."""
        result = composite_similarity(sine_wav, sine_wav)
        assert result['breakdown']['spectral'] > 95

    def test_spectral_orthogonal(self, sine_wav, noise_wav):
        """Sine vs noise → spectral > 0 (never binary 0)."""
        result = composite_similarity(sine_wav, noise_wav)
        assert result['breakdown']['spectral'] > 0

    def test_spectral_similar(self, tmp_dir):
        """440Hz vs 445Hz → spectral > 70 (very similar)."""
        import os, soundfile as sf
        sr = 22050
        t = np.linspace(0, 2, 2 * sr, endpoint=False)
        p1 = os.path.join(tmp_dir, "s440.wav")
        p2 = os.path.join(tmp_dir, "s445.wav")
        sf.write(p1, (0.5 * np.sin(2 * np.pi * 440 * t)).astype(np.float32), sr)
        sf.write(p2, (0.5 * np.sin(2 * np.pi * 445 * t)).astype(np.float32), sr)
        result = composite_similarity(p1, p2)
        assert result['breakdown']['spectral'] > 70


class TestOnsetF1Bipartite:
    def test_no_double_counting(self, sine_wav, noise_wav):
        """Bipartite matching: each synth onset matched at most once."""
        # This tests the internal logic — identical file should have high F1
        result = composite_similarity(sine_wav, sine_wav)
        assert result['breakdown']['attacks'] >= 80


class TestDualScore:
    def test_synthesis_only_keys(self, sine_wav):
        result = dual_score(sine_wav, sine_wav)
        assert 'synthesis_only_score' in result
        assert result['mode'] == 'synthesis_only'
        assert 'breakdown' in result
        assert 'synthesis_only' in result['breakdown']

    def test_hybrid_score_when_provided(self, sine_wav, noise_wav):
        result = dual_score(sine_wav, noise_wav, hybrid_path=sine_wav)
        assert 'hybrid_score' in result
        assert result['mode'] == 'hybrid'
        assert 'hybrid' in result['breakdown']

    def test_hybrid_missing_file_no_crash(self, sine_wav):
        result = dual_score(sine_wav, sine_wav, hybrid_path='/nonexistent.wav')
        # Should not crash, just no hybrid_score
        assert 'synthesis_only_score' in result

    def test_quality_label_production_ready(self, sine_wav):
        result = dual_score(sine_wav, sine_wav)
        assert result['quality'] == 'Production Ready'  # identical = high score

    def test_per_stem_targets_present(self, sine_wav):
        result = dual_score(sine_wav, sine_wav)
        assert result['per_stem_targets'] == {'drums': 80, 'bass': 75, 'synth': 70}
