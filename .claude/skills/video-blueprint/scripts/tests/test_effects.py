"""T6: analyze_layers/effects.py tests (Red Phase)."""

import math
import sys
from pathlib import Path

import cv2
import numpy as np
import pytest

_scripts = str(Path(__file__).resolve().parent.parent)
if _scripts not in sys.path:
    sys.path.insert(0, _scripts)


def _import_effects():
    try:
        from analyze_layers.effects import (
            detect_depth_varying_stroke,
            detect_glow,
            detect_breathing,
            detect_vignette,
            detect_chromatic_aberration,
            detect_grain,
            detect_depth_varying_opacity,
            detect_color_gradient,
        )
        return (detect_depth_varying_stroke, detect_glow, detect_breathing,
                detect_vignette, detect_chromatic_aberration, detect_grain,
                detect_depth_varying_opacity, detect_color_gradient)
    except ImportError:
        pytest.fail("analyze_layers.effects module not found — T6 not implemented yet")


def _make_concentric_shapes(stroke_widths):
    """Create shape list with varying stroke widths for depth testing."""
    shapes = []
    for i, sw in enumerate(stroke_widths):
        scale = 0.8 * (0.7 ** i)
        shapes.append({
            "width_px": 300 * scale,
            "height_px": 200 * scale,
            "stroke_width_px": sw,
            "centroid_px": (200.0, 200.0),
            "centroid_normalized": (0.5, 0.5),
            "area_px": 300 * scale * 200 * scale * 0.3,
            "area_normalized": 0.01 * scale,
            "angle_deg": 0,
        })
    return shapes


# ── Tests ────────────────────────────────────────────────

def test_stroke_depth_detection():
    """T6 #1: 3 concentric rects with stroke 10→5→2 → depth-varying detected."""
    detect_depth_varying_stroke, *_ = _import_effects()
    shapes = _make_concentric_shapes([10.0, 5.0, 2.0])
    result = detect_depth_varying_stroke(shapes)
    assert result["varies"], f"Should detect varying stroke: {result}"
    assert abs(result["near_width_px"] - 10.0) < 2, f"near={result['near_width_px']}"
    assert abs(result["far_width_px"] - 2.0) < 2, f"far={result['far_width_px']}"


def test_glow_exponential_decay():
    """T6 #2: Image with exp decay brightness around edges → glow detected."""
    _, detect_glow, *_ = _import_effects()
    # Create image with rect + exponential glow around it
    img = np.zeros((200, 200, 3), dtype=np.uint8)
    cv2.rectangle(img, (70, 70), (130, 130), (0, 200, 0), 3)
    # Add exp decay glow
    for d in range(1, 20):
        intensity = int(100 * math.exp(-d * 0.15))
        if intensity < 1:
            break
        cv2.rectangle(img, (70 - d, 70 - d), (130 + d, 130 + d), (0, intensity, 0), 1)

    mask = np.zeros((200, 200), dtype=np.uint8)
    cv2.rectangle(mask, (70, 70), (130, 130), 255, 3)
    result = detect_glow(img, mask)
    assert result["has_glow"], f"Should detect glow: {result}"


def test_breathing_sinusoidal():
    """T6 #3: 10 frames with sinusoidal size oscillation → breathing detected."""
    *_, detect_breathing = _import_effects()[:3]
    # Simulate shape widths across 10 frames: mean 100, amplitude 2%
    widths = [100.0 * (1 + 0.02 * math.sin(2 * math.pi * i / 10)) for i in range(10)]
    shapes_by_frame = {}
    for i, w in enumerate(widths):
        shapes_by_frame[i] = [{"width_px": w, "height_px": w * 0.7}]
    result = detect_breathing(shapes_by_frame)
    assert result["has_breathing"], f"Should detect breathing: {result}"
    assert abs(result["amplitude_ratio"] - 0.02) < 0.01, f"amplitude={result['amplitude_ratio']}"


def test_vignette_radial_profile():
    """T6 #4: Radial gradient image → vignette detected."""
    fns = _import_effects()
    detect_vignette = fns[3]
    # Create radial gradient: bright center → dark edges
    img = np.zeros((200, 200, 3), dtype=np.uint8)
    for y in range(200):
        for x in range(200):
            dist = math.sqrt((x - 100) ** 2 + (y - 100) ** 2) / 141.0  # normalize to [0,1]
            val = int(max(0, 200 * (1 - dist * 1.2)))
            img[y, x] = [val, val, val]
    result = detect_vignette(img)
    assert result["has_vignette"], f"Should detect vignette: {result}"
    assert result["darkening_ratio"] > 0.15


def test_ca_channel_shift():
    """T6 #5: R channel shifted 2px right → CA detected."""
    fns = _import_effects()
    detect_ca = fns[4]
    # Create image with a vertical white line at center
    img = np.zeros((100, 100, 3), dtype=np.uint8)
    img[:, 50, :] = 255  # White vertical line
    # Shift red channel 2px right
    shifted = img.copy()
    shifted[:, 2:, 2] = img[:, :-2, 2]  # Red channel (BGR index 2)
    shifted[:, :2, 2] = 0
    result = detect_ca(shifted)
    assert result["has_chromatic_aberration"], f"Should detect CA: {result}"
    assert result["max_shift_px"] > 0.5


def test_grain_detection():
    """T6 #6: Uniform image + random noise → grain detected."""
    fns = _import_effects()
    detect_grain = fns[5]
    rng = np.random.default_rng(42)
    img = np.full((100, 100, 3), 128, dtype=np.uint8)
    noise = rng.normal(0, 10, img.shape).astype(np.int16)
    img = np.clip(img.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    result = detect_grain(img)
    assert result["has_grain"], f"Should detect grain: {result}"


def test_no_effects_clean_image():
    """T6 #7: Clean geometric image → no effects detected."""
    fns = _import_effects()
    detect_glow = fns[1]
    detect_grain = fns[5]
    detect_vignette = fns[3]
    # Clean solid color image with a sharp rect
    img = np.full((200, 200, 3), 50, dtype=np.uint8)
    cv2.rectangle(img, (60, 60), (140, 140), (200, 200, 200), 2)
    mask = np.zeros((200, 200), dtype=np.uint8)
    cv2.rectangle(mask, (60, 60), (140, 140), 255, 2)

    glow_r = detect_glow(img, mask)
    grain_r = detect_grain(img)
    vig_r = detect_vignette(img)
    assert not glow_r["has_glow"], f"False glow: {glow_r}"
    assert not grain_r["has_grain"], f"False grain: {grain_r}"
    assert not vig_r["has_vignette"], f"False vignette: {vig_r}"


def test_depth_varying_opacity():
    """T6 #8: Shapes with decreasing brightness → depth opacity detected."""
    fns = _import_effects()
    detect_dv_opacity = fns[6]
    # Simulate shapes at different depths with measured brightness
    shapes = _make_concentric_shapes([8, 5, 3])
    # Add brightness info (outermost bright, innermost dim)
    shapes[0]["brightness"] = 180
    shapes[1]["brightness"] = 100
    shapes[2]["brightness"] = 30
    result = detect_dv_opacity(shapes)
    assert result["varies"], f"Should detect varying opacity: {result}"
    assert result["near_brightness"] > result["far_brightness"]


def test_color_gradient_detection():
    """T6 #9: Outermost vs innermost different LAB colors → gradient detected."""
    fns = _import_effects()
    detect_cg = fns[7]
    shapes = _make_concentric_shapes([8, 5, 3])
    shapes[0]["dominant_color_rgb"] = [200, 50, 50]  # Bright red
    shapes[2]["dominant_color_rgb"] = [150, 30, 30]  # Darker red
    result = detect_cg(shapes)
    assert result["has_gradient"], f"Should detect gradient: {result}"
    assert result["delta_e"] > 5


def test_unknown_effects_recorded():
    """T6 #10: Unrecognized pattern → recorded in unknown_effects[]."""
    # This tests that the effects aggregation function returns unknown_effects
    try:
        from analyze_layers.effects import detect_all_effects
    except ImportError:
        pytest.skip("detect_all_effects not yet implemented")
    # Create a simple test scenario
    img = np.zeros((100, 100, 3), dtype=np.uint8)
    result = detect_all_effects(img, [], {})
    assert "unknown_effects" in result
    assert isinstance(result["unknown_effects"], list)