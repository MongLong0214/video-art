"""T3: analyze-colors.py CIELAB upgrade tests (Red Phase)."""

import importlib.util
import json
import sys
from pathlib import Path

import numpy as np
import pytest

_script_path = Path(__file__).resolve().parent.parent / "analyze-colors.py"
_spec = importlib.util.spec_from_file_location("analyze_colors", _script_path)
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)


def test_lab_conversion_accuracy():
    """T3 #1: RGB→LAB conversion for known color (red)."""
    # Red #FF0000 → L≈53, a≈80, b≈67
    rgb_to_lab = getattr(_mod, "rgb_to_lab", None)
    assert rgb_to_lab is not None, "rgb_to_lab function not found"
    lab = rgb_to_lab(255, 0, 0)
    assert abs(lab[0] - 53) < 3, f"L={lab[0]}, expected ~53"
    assert abs(lab[1] - 80) < 5, f"a={lab[1]}, expected ~80"
    assert abs(lab[2] - 67) < 5, f"b={lab[2]}, expected ~67"


def test_delta_e2000_known_pair():
    """T3 #2: ΔE2000 for known color pair."""
    compute_delta_e = getattr(_mod, "compute_delta_e2000", None)
    assert compute_delta_e is not None, "compute_delta_e2000 function not found"
    # Two very similar colors should have small ΔE
    de = compute_delta_e([50, 0, 0], [50, 1, 0])  # LAB values
    assert de < 2.0, f"ΔE={de}, expected < 2 for very similar colors"
    # Very different colors should have large ΔE
    de2 = compute_delta_e([50, 0, 0], [90, 50, 50])
    assert de2 > 30, f"ΔE={de2}, expected > 30 for very different colors"


def test_merge_similar_colors_lab():
    """T3 #3: Colors with ΔE2000 < 15 should merge."""
    merge_fn = getattr(_mod, "merge_palettes", None)
    assert merge_fn is not None, "merge_palettes function not found"
    # Two very similar reds
    analyses = [
        {"palette": [
            {"hex": "#FF0000", "rgb": [255, 0, 0], "percentage": 50, "pixel_count": 100},
            {"hex": "#FE0101", "rgb": [254, 1, 1], "percentage": 50, "pixel_count": 100},
        ]},
    ]
    result = merge_fn(analyses, tolerance=15, use_lab=True)
    # Should merge into 1 color (ΔE < 15)
    assert len(result) == 1, f"Expected 1 merged color, got {len(result)}"


def test_keep_distinct_colors_lab():
    """T3 #4: Colors with ΔE2000 > 15 should NOT merge."""
    merge_fn = getattr(_mod, "merge_palettes", None)
    assert merge_fn is not None
    # Red and Blue — very different
    analyses = [
        {"palette": [
            {"hex": "#FF0000", "rgb": [255, 0, 0], "percentage": 50, "pixel_count": 100},
            {"hex": "#0000FF", "rgb": [0, 0, 255], "percentage": 50, "pixel_count": 100},
        ]},
    ]
    result = merge_fn(analyses, tolerance=15, use_lab=True)
    assert len(result) == 2, f"Expected 2 distinct colors, got {len(result)}"


def test_output_contains_lab_values():
    """T3 #5: colors.json output should contain 'lab' field."""
    from PIL import Image
    import tempfile, os
    # Create a simple red image
    img = Image.new("RGB", (50, 50), (255, 0, 0))
    with tempfile.TemporaryDirectory() as tmpdir:
        img_path = os.path.join(tmpdir, "frame_000.png")
        img.save(img_path)
        analyze_fn = getattr(_mod, "analyze_frame", None)
        assert analyze_fn is not None, "analyze_frame function not found"
        result = analyze_fn(img_path, n_clusters=2, sample_density=50)
        for color in result["palette"]:
            assert "lab" in color, f"Missing 'lab' field in palette entry: {color}"


def test_backward_compatible_output():
    """T3 #6: hex, rgb, percentage fields still present."""
    from PIL import Image
    import tempfile, os
    img = Image.new("RGB", (50, 50), (128, 64, 32))
    with tempfile.TemporaryDirectory() as tmpdir:
        img_path = os.path.join(tmpdir, "frame_000.png")
        img.save(img_path)
        analyze_fn = getattr(_mod, "analyze_frame", None)
        assert analyze_fn is not None
        result = analyze_fn(img_path, n_clusters=2, sample_density=50)
        for color in result["palette"]:
            assert "hex" in color
            assert "rgb" in color
            assert "percentage" in color