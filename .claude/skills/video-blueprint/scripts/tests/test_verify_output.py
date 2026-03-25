"""T12: verify-output.py tests (Red Phase)."""

import importlib.util
import json
import sys
from pathlib import Path

import cv2
import numpy as np
import pytest

_script_path = Path(__file__).resolve().parent.parent / "verify-output.py"


def _import_verify():
    if not _script_path.exists():
        pytest.fail("verify-output.py not found — T12 not implemented yet")
    spec = importlib.util.spec_from_file_location("verify_output", _script_path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def test_ssim_identical_frames():
    """T12 #1: Identical images → SSIM = 1.0."""
    mod = _import_verify()
    img = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
    ssim = mod.compute_ssim(img, img)
    assert abs(ssim - 1.0) < 0.01, f"SSIM {ssim} for identical images"


def test_ssim_different_frames():
    """T12 #2: Very different images → SSIM < 0.3."""
    mod = _import_verify()
    img_a = np.zeros((100, 100, 3), dtype=np.uint8)
    img_b = np.full((100, 100, 3), 255, dtype=np.uint8)
    ssim = mod.compute_ssim(img_a, img_b)
    assert ssim < 0.3, f"SSIM {ssim} for opposite images"


def test_palette_delta_e_report():
    """T12 #3: Two palettes → ΔE2000 array."""
    mod = _import_verify()
    palette_a = [{"hex": "#FF0000", "rgb": [255, 0, 0]}, {"hex": "#00FF00", "rgb": [0, 255, 0]}]
    palette_b = [{"hex": "#FE0101", "rgb": [254, 1, 1]}, {"hex": "#01FE01", "rgb": [1, 254, 1]}]
    report = mod.compare_palettes(palette_a, palette_b)
    assert "delta_e_values" in report
    assert len(report["delta_e_values"]) == 2
    assert all(de < 5 for de in report["delta_e_values"]), "Similar colors should have small ΔE"


def test_shape_count_comparison():
    """T12 #4: Same count → diff = 0."""
    mod = _import_verify()
    result = mod.compare_shape_counts(12, 12)
    assert result["diff"] == 0
    assert result["match"]


def test_verification_report_structure():
    """T12 #5: Report has required keys."""
    mod = _import_verify()
    report = mod.create_report(
        ssim_values=[0.9, 0.85, 0.88],
        palette_report={"delta_e_values": [2.0, 3.0]},
        shape_report={"diff": 0, "match": True},
    )
    assert "ssim_mean" in report
    assert "verdict" in report
    assert "ssim_per_frame" in report


def test_fail_verdict_below_threshold():
    """T12 #6: SSIM 0.6 → verdict FAIL."""
    mod = _import_verify()
    report = mod.create_report(
        ssim_values=[0.6, 0.5, 0.55],
        palette_report={"delta_e_values": [10.0]},
        shape_report={"diff": 3, "match": False},
    )
    assert report["verdict"] == "FAIL"