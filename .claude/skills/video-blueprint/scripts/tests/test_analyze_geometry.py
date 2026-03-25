"""T-GEO: analyze-geometry.py tests (Red Phase)."""

import importlib.util
import os
import tempfile
from pathlib import Path

import cv2
import numpy as np
import pytest

_script_path = Path(__file__).resolve().parent.parent / "analyze-geometry.py"
_spec = importlib.util.spec_from_file_location("analyze_geometry", _script_path)
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)

detect_shapes = _mod.detect_shapes
classify_shape = _mod.classify_shape
estimate_corner_radius = _mod.estimate_corner_radius
detect_concentric_pattern = _mod.detect_concentric_pattern
measure_stroke_width_precise = _mod.measure_stroke_width_precise
detect_symmetry = _mod.detect_symmetry
analyze_frame = _mod.analyze_frame
check_geometric_validity = getattr(_mod, "check_geometric_validity", None)


# ── Helpers ──────────────────────────────────────────────

def _black_bgr(h=200, w=200):
    """All-black BGR image."""
    return np.zeros((h, w, 3), dtype=np.uint8)


def _draw_white_rect(img, x, y, w, h, thickness=3):
    """Draw a white rectangle outline on img (in place)."""
    cv2.rectangle(img, (x, y), (x + w, y + h), (255, 255, 255), thickness)
    return img


def _draw_white_circle(img, cx, cy, r, thickness=3):
    """Draw a white circle outline on img (in place)."""
    cv2.circle(img, (cx, cy), r, (255, 255, 255), thickness)
    return img


def _make_frame_file(img_bgr):
    """Save image to a temp file, return (tmpdir_path, frame_path)."""
    tmpdir = tempfile.mkdtemp()
    frame_path = os.path.join(tmpdir, "frame_000.png")
    cv2.imwrite(frame_path, img_bgr)
    return tmpdir, frame_path


# ── classify_shape ────────────────────────────────────────

def test_classify_circle():
    """T-GEO #1: circularity > 0.85, aspect < 1.15 → 'circle'."""
    result = classify_shape(circularity=0.92, solidity=0.97, vertices=12, aspect=1.02)
    assert result == "circle", f"Expected 'circle', got '{result}'"


def test_classify_rect():
    """T-GEO #2: 4 vertices, circularity < 0.7 → 'rect'."""
    result = classify_shape(circularity=0.65, solidity=0.99, vertices=4, aspect=1.5)
    assert result == "rect", f"Expected 'rect', got '{result}'"


def test_classify_rounded_rect():
    """T-GEO #3: 4-8 vertices, circularity 0.7-0.85, aspect <= 1.15 → 'rounded_rect'.

    aspect must be <= 1.15 to avoid the ellipse branch (circularity > 0.75 AND aspect > 1.15).
    """
    result = classify_shape(circularity=0.78, solidity=0.98, vertices=6, aspect=1.05)
    assert result == "rounded_rect", f"Expected 'rounded_rect', got '{result}'"


def test_classify_triangle():
    """T-GEO #4: 3 vertices → 'triangle'."""
    result = classify_shape(circularity=0.60, solidity=0.95, vertices=3, aspect=1.2)
    assert result == "triangle", f"Expected 'triangle', got '{result}'"


def test_classify_ellipse():
    """T-GEO #5: circularity > 0.75, aspect > 1.15 → 'ellipse'."""
    result = classify_shape(circularity=0.80, solidity=0.97, vertices=10, aspect=1.8)
    assert result == "ellipse", f"Expected 'ellipse', got '{result}'"


# ── detect_shapes ─────────────────────────────────────────

def test_detect_shapes_synthetic_rects():
    """T-GEO #6: 3 white rectangles on black bg → detect at least 3 shapes."""
    img = _black_bgr(400, 400)
    _draw_white_rect(img, 20, 20, 80, 60)
    _draw_white_rect(img, 160, 20, 80, 60)
    _draw_white_rect(img, 300, 20, 80, 60)
    result = detect_shapes(img)
    assert "shapes" in result
    assert len(result["shapes"]) >= 3, (
        f"Expected at least 3 shapes, detected {len(result['shapes'])}"
    )


def test_detect_shapes_empty():
    """T-GEO #7: all-black image → 0 shapes detected."""
    img = _black_bgr(200, 200)
    result = detect_shapes(img)
    assert "shapes" in result
    assert len(result["shapes"]) == 0, (
        f"Expected 0 shapes on blank image, got {len(result['shapes'])}"
    )


def test_detect_shapes_returns_required_keys():
    """T-GEO #8: each shape dict contains required measurement keys."""
    img = _black_bgr(300, 300)
    _draw_white_rect(img, 50, 50, 150, 100)
    result = detect_shapes(img)
    if result["shapes"]:
        shape = result["shapes"][0]
        for key in ("shape_type", "center_px", "width_px", "height_px",
                    "circularity", "vertices", "area_px"):
            assert key in shape, f"Missing key '{key}' in shape dict"


# ── detect_concentric_pattern ─────────────────────────────

def _make_concentric_shapes(cx, cy, count=4, start_w=200, scale=0.75):
    """Create list of shape dicts with same center and decreasing size."""
    shapes = []
    w = start_w
    for i in range(count):
        h = w * 0.8
        shapes.append({
            "shape_type": "rect",
            "center_px": [float(cx), float(cy)],
            "center_normalized": [cx / 400.0, cy / 400.0],
            "width_px": float(w),
            "height_px": float(h),
            "width_normalized": w / 400.0,
            "height_normalized": h / 400.0,
            "area_px": float(w * h),
            "rotation_deg": 0.0,
        })
        w = w * scale
    return shapes


def test_concentric_pattern_detected():
    """T-GEO #9: shapes with same center, decreasing size → is_concentric=True."""
    shapes = _make_concentric_shapes(cx=200, cy=200, count=4)
    result = detect_concentric_pattern(shapes)
    assert result["is_concentric"] is True, (
        f"Expected is_concentric=True, got {result}"
    )


def test_concentric_pattern_rejected():
    """T-GEO #10: shapes with different centers → is_concentric=False."""
    shapes = [
        {
            "shape_type": "rect",
            "center_px": [float(cx), float(cy)],
            "center_normalized": [cx / 400.0, cy / 400.0],
            "width_px": float(w),
            "height_px": float(w * 0.8),
            "width_normalized": w / 400.0,
            "height_normalized": w * 0.8 / 400.0,
            "area_px": float(w * w * 0.8),
            "rotation_deg": 0.0,
        }
        for cx, cy, w in [(50, 50, 200), (200, 200, 150), (350, 350, 100), (100, 300, 80)]
    ]
    result = detect_concentric_pattern(shapes)
    assert result["is_concentric"] is False, (
        f"Expected is_concentric=False for spread-out shapes, got {result}"
    )


def test_concentric_pattern_needs_three():
    """T-GEO #11: fewer than 3 shapes → is_concentric=False."""
    shapes = _make_concentric_shapes(cx=200, cy=200, count=2)
    result = detect_concentric_pattern(shapes)
    assert result["is_concentric"] is False, (
        "Expected is_concentric=False with only 2 shapes"
    )


# ── detect_symmetry ───────────────────────────────────────

def test_symmetry_bilateral_xy():
    """T-GEO #12: perfectly symmetric image → type contains 'bilateral'."""
    # Draw a centered circle — symmetric on both axes
    img = _black_bgr(200, 200)
    _draw_white_circle(img, 100, 100, 60, thickness=4)
    result = detect_symmetry(img)
    assert "type" in result
    assert result["type"] in ("bilateral_xy", "bilateral_x", "bilateral_y", "rotational_180"), (
        f"Expected a symmetric type, got '{result['type']}'"
    )
    assert result["bilateral_x_score"] > 0.85, (
        f"bilateral_x_score={result['bilateral_x_score']} expected > 0.85 for circle"
    )


def test_symmetry_none():
    """T-GEO #13: random noise → symmetry score is measurably low or type is 'none'."""
    rng = np.random.default_rng(seed=42)
    img = rng.integers(0, 256, (200, 200, 3), dtype=np.uint8)
    result = detect_symmetry(img)
    assert "type" in result
    # For pure noise the bilateral scores should be well below the 0.92 threshold
    assert result["bilateral_x_score"] < 0.95, (
        f"bilateral_x_score={result['bilateral_x_score']} unexpectedly high for noise"
    )


# ── measure_stroke_width_precise ─────────────────────────

def test_stroke_width_detection():
    """T-GEO #14: image with known thick stroke → non-zero median width."""
    img = _black_bgr(200, 200)
    # Draw a thick rectangle to produce detectable strokes
    cv2.rectangle(img, (30, 30), (170, 170), (255, 255, 255), thickness=8)
    result = measure_stroke_width_precise(img)
    assert "median_stroke_width_px" in result or "note" in result
    if "median_stroke_width_px" in result:
        assert result["median_stroke_width_px"] > 0, (
            f"Expected non-zero stroke width, got {result['median_stroke_width_px']}"
        )


# ── analyze_frame ─────────────────────────────────────────

def test_analyze_frame_creates_result():
    """T-GEO #15: tmpdir with synthetic frame → dict with required top-level keys."""
    img = _black_bgr(300, 300)
    _draw_white_rect(img, 50, 50, 150, 120)
    _draw_white_circle(img, 230, 230, 40)
    _, frame_path = _make_frame_file(img)

    result = analyze_frame(frame_path)
    assert isinstance(result, dict)
    for key in ("frame", "resolution", "shapes", "shape_count",
                "concentric_pattern", "stroke_measurement", "symmetry"):
        assert key in result, f"Missing key '{key}' in analyze_frame result"


def test_analyze_frame_bad_path():
    """T-GEO #16: non-existent frame path → returns dict with 'error' key."""
    result = analyze_frame("/nonexistent/path/frame.png")
    assert isinstance(result, dict)
    assert "error" in result, "Expected 'error' key for unreadable frame"


# ── check_geometric_validity (E4 — new function) ─────────

def test_geometric_validity_pass():
    """T-GEO #17 (E4): valid geometric data → is_geometric=True."""
    if check_geometric_validity is None:
        pytest.fail("check_geometric_validity not found in analyze-geometry.py")
    analyses = [
        {
            "shape_count": 5,
            "shapes": [
                {"shape_type": "rect", "circularity": 0.72, "solidity": 0.97}
                for _ in range(5)
            ],
            "concentric_pattern": {"is_concentric": True, "count": 4},
            "symmetry": {"type": "bilateral_xy"},
        }
    ]
    result = check_geometric_validity(analyses)
    assert isinstance(result, dict)
    assert result.get("is_geometric") is True, (
        f"Expected is_geometric=True for valid data, got {result}"
    )


def test_geometric_validity_fail():
    """T-GEO #18 (E4): low shape count → is_geometric=False."""
    if check_geometric_validity is None:
        pytest.fail("check_geometric_validity not found in analyze-geometry.py")
    analyses = [
        {
            "shape_count": 0,
            "shapes": [],
            "concentric_pattern": {"is_concentric": False},
            "symmetry": {"type": "none"},
        }
    ]
    # shape_count=0 triggers the "avg < 3" early-exit rejection path
    result = check_geometric_validity(analyses)
    assert isinstance(result, dict)
    assert result.get("is_geometric") is False, (
        f"Expected is_geometric=False for zero-shape data, got {result}"
    )


# ── Criterion 2 rescue heuristics ────────────────────────


def _make_analyses_with_variance(shape_counts, symmetry_scores=None, concentric=False):
    """Build frame analyses with given shape counts and optional rescue signals.

    Args:
        shape_counts: list of int, per-frame shape counts (should trigger >50% variance).
        symmetry_scores: list of (x_score, y_score) per frame, or None for low scores.
        concentric: if True, first frame gets is_concentric=True.
    """
    analyses = []
    for i, sc in enumerate(shape_counts):
        sym_x, sym_y = (0.5, 0.5) if symmetry_scores is None else symmetry_scores[i]
        analyses.append({
            "shape_count": sc,
            "shapes": [
                {"shape_type": "rect", "circularity": 0.72, "solidity": 0.97}
                for _ in range(sc)
            ],
            "concentric_pattern": {
                "is_concentric": concentric and i == 0,
                "count": 4 if (concentric and i == 0) else 0,
            },
            "symmetry": {
                "type": "bilateral_xy" if sym_x > 0.90 and sym_y > 0.90 else "none",
                "bilateral_x_score": sym_x,
                "bilateral_y_score": sym_y,
            },
        })
    return analyses


def test_criterion2_no_rescue():
    """T-GEO #19: high shape-count variance without rescue signals → rejected."""
    if check_geometric_validity is None:
        pytest.fail("check_geometric_validity not found in analyze-geometry.py")
    # counts 4 and 20: range 16 > 0.5*20 → would fail criterion 2
    analyses = _make_analyses_with_variance(
        shape_counts=[4, 20],
        symmetry_scores=[(0.5, 0.5), (0.5, 0.5)],
        concentric=False,
    )
    result = check_geometric_validity(analyses)
    assert result.get("is_geometric") is False, (
        f"Expected rejection for high variance without rescue, got {result}"
    )


def test_criterion2_symmetry_rescue():
    """T-GEO #20: high variance BUT all frames bilateral_xy > 0.90 → rescued."""
    if check_geometric_validity is None:
        pytest.fail("check_geometric_validity not found in analyze-geometry.py")
    analyses = _make_analyses_with_variance(
        shape_counts=[4, 20],
        symmetry_scores=[(0.95, 0.93), (0.92, 0.94)],
        concentric=False,
    )
    result = check_geometric_validity(analyses)
    assert result.get("is_geometric") is True, (
        f"Expected symmetry rescue to pass, got {result}"
    )


def test_criterion2_concentric_rescue():
    """T-GEO #21: high variance BUT concentric detected in a frame → rescued."""
    if check_geometric_validity is None:
        pytest.fail("check_geometric_validity not found in analyze-geometry.py")
    analyses = _make_analyses_with_variance(
        shape_counts=[4, 20],
        symmetry_scores=[(0.5, 0.5), (0.5, 0.5)],
        concentric=True,
    )
    result = check_geometric_validity(analyses)
    assert result.get("is_geometric") is True, (
        f"Expected concentric rescue to pass, got {result}"
    )


# ── estimate_corner_radius ────────────────────────────────


def _make_rounded_rect_contour(cx=200, cy=200, w=160, h=100, r=20):
    """Draw a filled rounded rectangle and extract its outer contour."""
    img = np.zeros((400, 400), dtype=np.uint8)
    # Inner rect body
    cv2.rectangle(img, (cx - w // 2 + r, cy - h // 2),
                  (cx + w // 2 - r, cy + h // 2), 255, -1)
    cv2.rectangle(img, (cx - w // 2, cy - h // 2 + r),
                  (cx + w // 2, cy + h // 2 - r), 255, -1)
    # Corner circles
    for dx, dy in [(-1, -1), (1, -1), (-1, 1), (1, 1)]:
        cv2.circle(img, (cx + dx * (w // 2 - r), cy + dy * (h // 2 - r)), r, 255, -1)
    contours, _ = cv2.findContours(img, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    return contours[0] if contours else None


def test_estimate_corner_radius_basic():
    """T-GEO #22: synthetic rounded rect with r=20 → estimated radius > 0."""
    contour = _make_rounded_rect_contour(cx=200, cy=200, w=160, h=100, r=20)
    assert contour is not None, "Could not extract rounded rect contour"
    assert len(contour) >= 20, f"Contour too short ({len(contour)} pts) for curvature estimation"
    radius = estimate_corner_radius(contour, rect_w=160.0, rect_h=100.0)
    assert radius > 0, f"Expected corner_radius > 0, got {radius}"
    # Radius should be in a reasonable range around the drawn r=20
    assert 5 < radius < 60, f"Corner radius {radius} outside expected range [5, 60]"
