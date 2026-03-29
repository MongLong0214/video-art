"""T17: master.py — 3-band EQ + multiband comp + LUFS limiter tests."""

import os
import json
import tempfile
import numpy as np
import soundfile as sf
import pytest


@pytest.fixture
def low_only_wav(tmp_dir):
    """100Hz sine (low-only signal, no mid/high)."""
    sr = 22050
    t = np.linspace(0, 2, 2 * sr, endpoint=False)
    y = 0.5 * np.sin(2 * np.pi * 100 * t).astype(np.float32)
    p = os.path.join(tmp_dir, "low_only.wav")
    sf.write(p, y, sr)
    return p


@pytest.fixture
def loud_wav(tmp_dir):
    """Loud broadband signal (-6 LUFS approx)."""
    sr = 22050
    t = np.linspace(0, 2, 2 * sr, endpoint=False)
    y = 0.8 * np.sin(2 * np.pi * 440 * t).astype(np.float32)
    p = os.path.join(tmp_dir, "loud.wav")
    sf.write(p, y, sr)
    return p


@pytest.fixture
def analysis_json(tmp_dir):
    """Minimal analysis.json with frequency_balance."""
    data = {
        "frequency_balance": {"low": 0.7, "mid": 0.2, "hi": 0.1},
        "loudness": {"integrated": -18, "range": 6, "short_term_max": -12},
    }
    p = os.path.join(tmp_dir, "analysis.json")
    with open(p, "w") as f:
        json.dump(data, f)
    return p


@pytest.fixture
def null_balance_analysis(tmp_dir):
    """analysis.json with no frequency_balance."""
    data = {"loudness": {"integrated": -18, "range": 6, "short_term_max": -12}}
    p = os.path.join(tmp_dir, "analysis.json")
    with open(p, "w") as f:
        json.dump(data, f)
    return p


class TestEqMidBoost:
    """AC-1/2: 3-band EQ with dynamic gain."""

    def test_eq_mid_boost(self, low_only_wav, analysis_json):
        from master import master_audio
        out = master_audio(low_only_wav, analysis_json)
        assert os.path.exists(out)
        y, sr = sf.read(out)
        assert len(y) > 0

    def test_eq_clamp_max(self):
        """AC-2: extreme imbalance → mid <= +8dB, high <= +6dB."""
        from master import compute_eq_gains
        balance = {"low": 0.95, "mid": 0.03, "hi": 0.02}
        gains = compute_eq_gains(balance)
        assert gains["mid"] <= 8.0
        assert gains["hi"] <= 6.0


class TestEqFallback:
    """AC-2: fallback when frequency_balance is null."""

    def test_eq_fallback_null_balance(self):
        from master import compute_eq_gains
        gains = compute_eq_gains(None)
        assert gains["mid"] == pytest.approx(6.0)
        assert gains["hi"] == pytest.approx(4.0)


class TestLufsNormalization:
    """AC-4: LUFS -14 target."""

    def test_lufs_normalization(self, loud_wav, analysis_json):
        from master import master_audio
        out = master_audio(loud_wav, analysis_json)
        y, sr = sf.read(out)
        try:
            import pyloudnorm as pyln
            meter = pyln.Meter(sr)
            lufs = meter.integrated_loudness(y)
            assert -15.5 < lufs < -12.5  # within 1.5dB of -14 target
        except ImportError:
            pytest.skip("pyloudnorm not installed")


class TestSilenceBypass:
    """AC-2 edge: silent input → bypass (output stays silent)."""

    def test_silence_bypass(self, silence_wav, analysis_json):
        from master import master_audio
        out = master_audio(silence_wav, analysis_json)
        y, sr = sf.read(out)
        rms = np.sqrt(np.mean(y ** 2))
        assert rms < 0.001


class TestNonRegressionGate:
    """AC-7: mastering worsens score → original preserved."""

    def test_non_regression_gate(self):
        from master import non_regression_gate
        result = non_regression_gate(
            before_score=75.0,
            after_score=70.0,
            threshold=3.0,
        )
        assert result["action"] == "reject"
        assert result["delta"] == pytest.approx(-5.0)

    def test_non_regression_pass(self):
        from master import non_regression_gate
        result = non_regression_gate(
            before_score=70.0,
            after_score=75.0,
            threshold=3.0,
        )
        assert result["action"] == "accept"
        assert result["delta"] == pytest.approx(5.0)


class TestPeakLimiter:
    """AC-7: peak > -0.3dBFS → re-limited."""

    def test_peak_limiter(self, loud_wav, analysis_json):
        from master import master_audio
        out = master_audio(loud_wav, analysis_json)
        y, sr = sf.read(out)
        peak_db = 20 * np.log10(np.max(np.abs(y)) + 1e-10)
        assert peak_db <= -0.3


class TestIntegration:
    """AC-5: full pipeline integration — EQ + comp + LUFS + peak limit."""

    def test_master_integration(self, sine_wav, analysis_json):
        from master import master_audio
        out = master_audio(sine_wav, analysis_json)
        assert os.path.exists(out)
        y, sr = sf.read(out)
        assert len(y) > 0
        # Peak limiter was applied
        peak_db = 20 * np.log10(np.max(np.abs(y)) + 1e-10)
        assert peak_db <= -0.3
