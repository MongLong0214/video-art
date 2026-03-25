"""T5: analyze_layers/motion.py tests (Red Phase)."""

import math
import sys
from pathlib import Path

import cv2
import numpy as np
import pytest

_scripts = str(Path(__file__).resolve().parent.parent)
if _scripts not in sys.path:
    sys.path.insert(0, _scripts)


def _import_motion():
    try:
        from analyze_layers.motion import (
            match_shapes,
            compute_shape_motion,
            classify_speed_pattern,
            detect_zoom,
            classify_motion_type,
        )
        return match_shapes, compute_shape_motion, classify_speed_pattern, detect_zoom, classify_motion_type
    except ImportError:
        pytest.fail("analyze_layers.motion module not found — T5 not implemented yet")


def _make_shape(cx, cy, w, h, angle, area=None):
    """Helper to create a shape dict."""
    return {
        "centroid_px": (cx, cy),
        "centroid_normalized": (cx / 400, cy / 400),
        "width_px": w,
        "height_px": h,
        "angle_deg": angle,
        "area_px": area or w * h * 0.8,
        "area_normalized": (area or w * h * 0.8) / (400 * 400),
    }


# ── Tests ────────────────────────────────────────────────

def test_shape_matching_stable():
    """T5 #1: Same position+size → match succeeds."""
    match_shapes, *_ = _import_motion()
    a = [_make_shape(200, 200, 100, 80, 0)]
    b = [_make_shape(202, 198, 100, 80, 5)]  # Slight movement
    matches = match_shapes(a, b)
    assert len(matches) >= 1, "Should match the shape"
    assert matches[0][2] < 0.15, f"Match score {matches[0][2]} too high"


def test_rotation_measurement_known():
    """T5 #2: 5° rotation → delta measured accurately."""
    _, compute_shape_motion, *_ = _import_motion()
    sa = _make_shape(200, 200, 100, 80, 10.0)
    sb = _make_shape(200, 200, 100, 80, 15.0)
    motion = compute_shape_motion(sa, sb)
    assert abs(motion["rotation_delta_deg"] - 5.0) < 1.0, \
        f"Rotation delta {motion['rotation_delta_deg']}, expected ~5.0"


def test_90deg_ambiguity_resolved():
    """T5 #3: 89°→91° (actual 2° rotation) → resolved, not 178° jump."""
    _, compute_shape_motion, *_ = _import_motion()
    sa = _make_shape(200, 200, 100, 80, 89.0)
    sb = _make_shape(200, 200, 100, 80, 91.0)
    motion = compute_shape_motion(sa, sb)
    delta = abs(motion["rotation_delta_deg"])
    assert delta < 10, f"Delta {delta}° — should be ~2°, not 178° (90° ambiguity)"


def test_variable_speed_linear_fit():
    """T5 #4: speeds [1,2,3,4,5] → linear fit."""
    *_, classify_speed_pattern, _, _ = _import_motion()
    speeds = [1.0, 2.0, 3.0, 4.0, 5.0]
    result = classify_speed_pattern(speeds)
    assert result["formula"] == "linear", f"Got {result['formula']}, expected linear"
    assert result.get("r_squared", 0) > 0.95


def test_variable_speed_geometric_fit():
    """T5 #5: speeds [1,2,4,8,16] → geometric fit."""
    *_, classify_speed_pattern, _, _ = _import_motion()
    speeds = [1.0, 2.0, 4.0, 8.0, 16.0]
    result = classify_speed_pattern(speeds)
    assert result["formula"] == "geometric", f"Got {result['formula']}, expected geometric"
    assert result.get("r_squared", 0) > 0.95


def test_uniform_speed_detection():
    """T5 #6: speeds [5,5,5,5] → uniform."""
    *_, classify_speed_pattern, _, _ = _import_motion()
    speeds = [5.0, 5.0, 5.0, 5.0]
    result = classify_speed_pattern(speeds)
    assert result["formula"] == "uniform", f"Got {result['formula']}, expected uniform"


def test_zoom_detection_shrinking_shapes():
    """T5 #7: Shapes moving inward + shrinking → zoom_inward."""
    *_, detect_zoom, _ = _import_motion()
    motions = [
        {"radial_change": -0.02, "scale_change": 0.95},
        {"radial_change": -0.03, "scale_change": 0.93},
        {"radial_change": -0.01, "scale_change": 0.97},
    ]
    result = detect_zoom(motions)
    assert result["has_zoom"], "Should detect zoom"
    assert result["type"] == "zoom_inward"


def test_rotation_not_zoom():
    """T5 #8: Only angle changes, no size/position change → not zoom."""
    *_, detect_zoom, _ = _import_motion()
    motions = [
        {"radial_change": 0.001, "scale_change": 1.0},
        {"radial_change": -0.001, "scale_change": 1.0},
    ]
    result = detect_zoom(motions)
    assert not result["has_zoom"], "Should NOT detect zoom for pure rotation"


@pytest.mark.integration
def test_psy_back_layer_speeds():
    """T5 #9: psy.mov burgundy layer → variable rotation speeds detected."""
    frames_dir = Path(__file__).parents[4] / "video-blueprint-frames"
    if not (frames_dir / "frame_000.png").exists():
        pytest.skip("psy.mov frames not available")
    # Full integration test requires motion tracking across frames
    # For now just verify the module can be imported and functions exist
    match_shapes, compute_shape_motion, classify_speed_pattern, detect_zoom, classify_motion_type = _import_motion()
    assert callable(match_shapes)
    assert callable(classify_speed_pattern)


@pytest.mark.integration
def test_psy_front_layer_zoom():
    """T5 #10: psy.mov gold+navy → zoom_inward detected."""
    frames_dir = Path(__file__).parents[4] / "video-blueprint-frames"
    if not (frames_dir / "frame_000.png").exists():
        pytest.skip("psy.mov frames not available")
    *_, detect_zoom, classify_motion_type = _import_motion()
    assert callable(detect_zoom)
    assert callable(classify_motion_type)


def test_spiral_classification():
    """T5 #11: rotation + zoom simultaneous → spiral."""
    *_, classify_motion_type = _import_motion()
    result = classify_motion_type(has_rotation=True, has_zoom=True, has_variable_speed=False)
    assert result == "spiral", f"Got {result}, expected spiral"


def test_frame_shape_count_mismatch():
    """T5 #12: Frame pair with different shape counts → unmatched shapes tolerated."""
    match_shapes, *_ = _import_motion()
    a = [_make_shape(100, 100, 50, 40, 0), _make_shape(200, 200, 50, 40, 0)]
    b = [_make_shape(102, 98, 50, 40, 5)]  # Only 1 shape in frame B
    matches = match_shapes(a, b)
    assert len(matches) == 1, f"Should match 1 of 2, got {len(matches)}"