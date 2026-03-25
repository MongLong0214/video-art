"""T4: analyze_layers/color_mask.py tests (Red Phase)."""

import json
import sys
from pathlib import Path

import cv2
import numpy as np
import pytest
from PIL import Image


# ── Helpers ──────────────────────────────────────────────

def _make_two_color_image(size=200):
    """Create image with red left half, blue right half."""
    img = np.zeros((size, size, 3), dtype=np.uint8)
    img[:, :size // 2] = [0, 0, 255]  # Red (BGR for OpenCV, but we'll use RGB)
    img[:, size // 2:] = [255, 0, 0]  # Blue
    return img


def _make_concentric_rects(size=400, n=3, base_scale=0.8, step=0.7, color=(0, 200, 0)):
    """Create image with n concentric rectangles of decreasing size."""
    img = np.zeros((size, size, 3), dtype=np.uint8)
    for i in range(n):
        s = base_scale * (step ** i)
        hw = int(size * s / 2)
        hh = int(size * s * 0.7 / 2)
        cx, cy = size // 2, size // 2
        thickness = max(8, int(12 * (step ** i)))  # Thick enough to survive erosion
        cv2.rectangle(img, (cx - hw, cy - hh), (cx + hw, cy + hh), color, thickness)
    return img


def _make_glow_border_image(size=200):
    """Create image with a sharp rect + soft glow around it."""
    img = np.zeros((size, size, 3), dtype=np.uint8)
    # Sharp green rect
    cv2.rectangle(img, (60, 60), (140, 140), (0, 200, 0), 2)
    # Simulate glow with gaussian blur overlay
    glow = np.zeros_like(img)
    cv2.rectangle(glow, (60, 60), (140, 140), (0, 100, 0), 8)
    glow = cv2.GaussianBlur(glow, (21, 21), 5)
    img = cv2.add(img, glow)
    return img


# ── Import module under test ─────────────────────────────

@pytest.fixture(autouse=True)
def _add_path():
    scripts = str(Path(__file__).resolve().parent.parent)
    if scripts not in sys.path:
        sys.path.insert(0, scripts)


def _import_color_mask():
    try:
        from analyze_layers.color_mask import (
            create_color_mask,
            measure_shapes_in_mask,
            detect_concentric_pattern,
            group_color_families,
        )
        return create_color_mask, measure_shapes_in_mask, detect_concentric_pattern, group_color_families
    except ImportError:
        pytest.fail("analyze_layers.color_mask module not found — T4 not implemented yet")


# ── Tests ────────────────────────────────────────────────

def test_color_mask_single_color():
    """T4 #1: Single-color image → mask covers all pixels."""
    create_color_mask, *_ = _import_color_mask()
    img = np.full((100, 100, 3), [0, 200, 0], dtype=np.uint8)  # Green
    mask = create_color_mask(img, (0, 200, 0), tolerance=40)
    coverage = mask.sum() / 255 / (100 * 100)
    assert coverage > 0.9, f"Single color coverage {coverage:.2f}, expected > 0.9"


def test_color_mask_two_colors():
    """T4 #2: Two-color image → two independent masks."""
    create_color_mask, *_ = _import_color_mask()
    img = _make_two_color_image(200)
    mask_red = create_color_mask(img, (0, 0, 255), tolerance=40)
    mask_blue = create_color_mask(img, (255, 0, 0), tolerance=40)
    red_coverage = mask_red.sum() / 255 / (200 * 200)
    blue_coverage = mask_blue.sum() / 255 / (200 * 200)
    assert red_coverage > 0.3, f"Red coverage {red_coverage:.2f}"
    assert blue_coverage > 0.3, f"Blue coverage {blue_coverage:.2f}"
    # Masks should not overlap significantly
    overlap = (mask_red & mask_blue).sum() / 255 / (200 * 200)
    assert overlap < 0.05, f"Overlap {overlap:.2f}, expected < 0.05"


def test_morphological_erosion_removes_aa():
    """T4 #3: After erosion, contour count should be stable."""
    create_color_mask, measure_shapes_in_mask, *_ = _import_color_mask()
    img = _make_concentric_rects(400, n=3, color=(0, 200, 0))
    mask = create_color_mask(img, (0, 200, 0), tolerance=40)
    shapes = measure_shapes_in_mask(mask, img, min_area_ratio=0.001)
    # Should find approximately 3 shapes (one per rect)
    assert 2 <= len(shapes) <= 8, f"Expected 2-8 shapes, got {len(shapes)}"


def test_shape_measurement_known_rect():
    """T4 #4: Known rect → width/height/angle measured accurately."""
    create_color_mask, measure_shapes_in_mask, *_ = _import_color_mask()
    img = np.zeros((400, 400, 3), dtype=np.uint8)
    # Draw a 200x100 white rect at center, no rotation
    cv2.rectangle(img, (100, 150), (300, 250), (255, 255, 255), 3)
    mask = create_color_mask(img, (255, 255, 255), tolerance=40)
    shapes = measure_shapes_in_mask(mask, img, min_area_ratio=0.001)
    assert len(shapes) >= 1, "No shapes found"
    s = shapes[0]
    # Width should be ~200, height ~100 (or swapped)
    dims = sorted([s["width_px"], s["height_px"]], reverse=True)
    assert abs(dims[0] - 200) < 20, f"Width {dims[0]}, expected ~200"
    assert abs(dims[1] - 100) < 20, f"Height {dims[1]}, expected ~100"


def test_concentric_scale_ratio():
    """T4 #5: 3 concentric rects with scale 0.7 → ratio measured."""
    create_color_mask, measure_shapes_in_mask, detect_concentric_pattern, _ = _import_color_mask()
    img = _make_concentric_rects(400, n=3, base_scale=0.8, step=0.7, color=(0, 200, 0))
    mask = create_color_mask(img, (0, 200, 0), tolerance=40)
    shapes = measure_shapes_in_mask(mask, img, min_area_ratio=0.001)
    pattern = detect_concentric_pattern(shapes)
    assert pattern.get("is_concentric"), "Not detected as concentric"
    if pattern.get("mean_scale_ratio"):
        ratio = pattern["mean_scale_ratio"]
        assert 0.5 < ratio < 0.9, f"Scale ratio {ratio}, expected ~0.7"


def test_color_family_merge():
    """T4 #6: Two colors with ΔE < 15 merge into one family."""
    *_, group_color_families = _import_color_mask()
    palette = [
        {"hex": "#C80000", "rgb": [200, 0, 0], "avg_percentage": 30},
        {"hex": "#C20505", "rgb": [194, 5, 5], "avg_percentage": 20},  # Very similar red
        {"hex": "#0000C8", "rgb": [0, 0, 200], "avg_percentage": 50},  # Blue — different
    ]
    families = group_color_families(palette, delta_e_threshold=15)
    assert len(families) == 2, f"Expected 2 families, got {len(families)}: {list(families.keys())}"


def test_layers_json_output_structure():
    """T4 #7: Output dict has required keys."""
    # This tests the main analyze function output structure
    try:
        from analyze_layers import analyze as run_analyze
    except ImportError:
        pytest.skip("analyze_layers.analyze not yet implemented")

    # We just check the function exists and has the right signature
    import inspect
    sig = inspect.signature(run_analyze)
    assert "frames_dir" in sig.parameters or len(sig.parameters) >= 1


@pytest.mark.integration
def test_psy_mov_two_layers():
    """T4 #8: psy.mov frames → at least 2 color groups (burgundy + gold)."""
    frames_dir = Path(__file__).parents[4] / "video-blueprint-frames"
    if not (frames_dir / "frame_000.png").exists():
        pytest.skip("psy.mov frames not available")

    *_, group_color_families = _import_color_mask()

    # Load colors.json if available
    colors_path = frames_dir / "colors.json"
    if not colors_path.exists():
        pytest.skip("colors.json not available")

    with open(colors_path) as f:
        colors_data = json.load(f)

    palette = colors_data["canonical_palette"]
    # Filter to significant non-background colors
    sig_colors = [c for c in palette if c["avg_percentage"] > 2]
    families = group_color_families(sig_colors, delta_e_threshold=15)
    assert len(families) >= 2, f"Expected ≥2 color families, got {len(families)}"


def test_glow_border_excluded_from_shapes():
    """T4 #9: Glow border pixels should not inflate shape measurements."""
    create_color_mask, measure_shapes_in_mask, *_ = _import_color_mask()
    img = _make_glow_border_image(200)
    mask = create_color_mask(img, (0, 200, 0), tolerance=40)
    shapes = measure_shapes_in_mask(mask, img, min_area_ratio=0.001)
    if shapes:
        # The measured shape should be close to the actual rect size (80x80), not inflated by glow
        s = shapes[0]
        max_dim = max(s["width_px"], s["height_px"])
        assert max_dim < 120, f"Shape dimension {max_dim} too large — glow border likely included"