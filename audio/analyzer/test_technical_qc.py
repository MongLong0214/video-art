"""Tests for technical_qc.py."""

import json
import os

import numpy as np
import soundfile as sf

from technical_qc import analyze_technical_qc, write_qc_json


def test_qc_detects_silence(silence_wav):
    result = analyze_technical_qc(silence_wav)
    assert result["passed"] is False
    assert any("silent" in warning.lower() for warning in result["warnings"])


def test_qc_detects_peak_violation(tmp_dir):
    sr = 44100
    t = np.linspace(0, 1, sr, endpoint=False)
    y = 0.99 * np.sin(2 * np.pi * 440 * t).astype(np.float32)
    wav = os.path.join(tmp_dir, "hot.wav")
    sf.write(wav, y, sr)

    result = analyze_technical_qc(wav)
    assert result["peak_dbfs"] > -0.3
    assert result["passed"] is False


def test_qc_writes_json_artifact(tmp_dir):
    sr = 44100
    t = np.linspace(0, 1, sr, endpoint=False)
    y = 0.7 * np.sin(2 * np.pi * 440 * t).astype(np.float32)
    loud_wav = os.path.join(tmp_dir, "loud.wav")
    sf.write(loud_wav, y, sr)

    out_path = os.path.join(tmp_dir, "technical-qc.json")
    result = write_qc_json(loud_wav, out_path)

    assert os.path.exists(out_path)
    saved = json.load(open(out_path))
    assert saved["wav_path"].endswith("loud.wav")
    assert saved["peak_dbfs"] == result["peak_dbfs"]
    assert "warnings" in saved


def test_qc_reports_stereo_width(tmp_dir):
    sr = 44100
    t = np.linspace(0, 1, sr, endpoint=False)
    left = 0.3 * np.sin(2 * np.pi * 220 * t)
    right = 0.3 * np.sin(2 * np.pi * 224 * t)
    y = np.column_stack([left, right]).astype(np.float32)
    wav = os.path.join(tmp_dir, "stereo.wav")
    sf.write(wav, y, sr)

    result = analyze_technical_qc(wav)
    assert result["channels"] == 2
    assert result["stereo_width"] > 0
