"""Shared pytest fixtures — programmatic WAV generation with numpy."""
import os
import tempfile
import numpy as np
import soundfile as sf
import pytest


@pytest.fixture
def tmp_dir():
    with tempfile.TemporaryDirectory() as d:
        yield d


@pytest.fixture
def sine_wav(tmp_dir):
    """440Hz sine wave, 2 seconds, mono, 22050Hz."""
    sr = 22050
    t = np.linspace(0, 2, 2 * sr, endpoint=False)
    y = 0.5 * np.sin(2 * np.pi * 440 * t).astype(np.float32)
    p = os.path.join(tmp_dir, "sine.wav")
    sf.write(p, y, sr)
    return p


@pytest.fixture
def noise_wav(tmp_dir):
    """White noise, 2 seconds, mono, 22050Hz."""
    sr = 22050
    rng = np.random.default_rng(42)
    y = (0.3 * rng.standard_normal(2 * sr)).astype(np.float32)
    p = os.path.join(tmp_dir, "noise.wav")
    sf.write(p, y, sr)
    return p


@pytest.fixture
def silence_wav(tmp_dir):
    """Silent WAV, 1 second."""
    sr = 22050
    y = np.zeros(sr, dtype=np.float32)
    p = os.path.join(tmp_dir, "silence.wav")
    sf.write(p, y, sr)
    return p


@pytest.fixture
def kick_segment():
    """60Hz sine burst — should classify as kick."""
    sr = 22050
    t = np.linspace(0, 0.1, int(0.1 * sr), endpoint=False)
    return (0.8 * np.sin(2 * np.pi * 60 * t)).astype(np.float32), sr


@pytest.fixture
def hat_segment():
    """8kHz sine burst — should classify as hat."""
    sr = 22050
    t = np.linspace(0, 0.05, int(0.05 * sr), endpoint=False)
    return (0.5 * np.sin(2 * np.pi * 8000 * t)).astype(np.float32), sr


@pytest.fixture
def noise_segment():
    """White noise burst — should classify as snare (high flatness)."""
    sr = 22050
    rng = np.random.default_rng(42)
    return (0.4 * rng.standard_normal(int(0.08 * sr))).astype(np.float32), sr
