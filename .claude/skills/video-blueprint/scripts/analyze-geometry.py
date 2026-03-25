#!/usr/bin/env python3
"""
Precise geometric shape analysis from video frames using OpenCV.

Measures: shape count, bounding dimensions, corner radius, rotation angles,
scale ratios between concentric shapes, stroke width, nesting relationships.

Usage:
  python analyze-geometry.py <frames_dir> [--frame-index N]

Dependencies: opencv-python-headless, numpy

Output: geometry.json in the frames directory
"""

import argparse
import json
import math
import os
import sys
from pathlib import Path

try:
    import cv2
    import numpy as np
except ImportError:
    print("Error: opencv-python-headless and numpy are required.\n"
          "  pip install opencv-python-headless numpy", file=sys.stderr)
    sys.exit(1)


def detect_shapes(img_bgr: np.ndarray) -> dict:
    """Detect shapes via edge detection and contour analysis."""
    h, w = img_bgr.shape[:2]
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

    # Multi-scale edge detection for robustness
    edges_fine = cv2.Canny(gray, 30, 100)
    edges_coarse = cv2.Canny(gray, 50, 150)
    edges = cv2.bitwise_or(edges_fine, edges_coarse)

    # Dilate slightly to close small gaps
    kernel = np.ones((2, 2), np.uint8)
    edges = cv2.dilate(edges, kernel, iterations=1)

    # Find contours
    contours, hierarchy = cv2.findContours(edges, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

    if hierarchy is None:
        return {"shapes": [], "hierarchy_depth": 0}

    hierarchy = hierarchy[0]

    # Analyze each contour
    shapes = []
    min_area = w * h * 0.0005  # filter tiny noise

    for i, contour in enumerate(contours):
        area = cv2.contourArea(contour)
        if area < min_area:
            continue

        perimeter = cv2.arcLength(contour, True)
        if perimeter < 10:
            continue

        # Bounding rect (rotated)
        rect = cv2.minAreaRect(contour)
        center = rect[0]
        size = rect[1]
        angle = rect[2]

        # Normalize dimensions (larger = width)
        rect_w = max(size[0], size[1])
        rect_h = min(size[0], size[1])
        if size[0] < size[1]:
            angle += 90

        # Aspect ratio of bounding rect
        aspect = rect_w / rect_h if rect_h > 0 else 1

        # Circularity: 4π·area / perimeter²
        circularity = 4 * math.pi * area / (perimeter ** 2) if perimeter > 0 else 0

        # Solidity: contour area / convex hull area
        hull = cv2.convexHull(contour)
        hull_area = cv2.contourArea(hull)
        solidity = area / hull_area if hull_area > 0 else 0

        # Approximate polygon
        epsilon = 0.02 * perimeter
        approx = cv2.approxPolyDP(contour, epsilon, True)
        vertices = len(approx)

        # Shape classification
        shape_type = classify_shape(circularity, solidity, vertices, aspect)

        # Estimate corner radius for rounded rects
        corner_radius = estimate_corner_radius(contour, rect_w, rect_h) if shape_type == "rounded_rect" else 0

        # Hierarchy info
        parent_idx = hierarchy[i][3]
        child_count = 0
        child_idx = hierarchy[i][2]
        while child_idx >= 0:
            child_count += 1
            child_idx = hierarchy[child_idx][0]

        shapes.append({
            "contour_index": i,
            "shape_type": shape_type,
            "center_px": [round(center[0], 1), round(center[1], 1)],
            "center_normalized": [round(center[0] / w, 4), round(center[1] / h, 4)],
            "width_px": round(rect_w, 1),
            "height_px": round(rect_h, 1),
            "width_normalized": round(rect_w / w, 4),
            "height_normalized": round(rect_h / h, 4),
            "rotation_deg": round(angle % 360, 2),
            "area_px": round(area, 1),
            "area_normalized": round(area / (w * h), 6),
            "perimeter_px": round(perimeter, 1),
            "circularity": round(circularity, 4),
            "solidity": round(solidity, 4),
            "aspect_ratio": round(aspect, 4),
            "vertices": vertices,
            "corner_radius_px": round(corner_radius, 1),
            "corner_radius_normalized": round(corner_radius / rect_w, 4) if rect_w > 0 else 0,
            "parent_contour_index": parent_idx,
            "child_count": child_count,
        })

    # Sort by area (largest first)
    shapes.sort(key=lambda s: s["area_px"], reverse=True)

    # Compute hierarchy depth
    max_depth = 0
    for i in range(len(hierarchy)):
        depth = 0
        idx = i
        while hierarchy[idx][3] >= 0:
            depth += 1
            idx = hierarchy[idx][3]
        max_depth = max(max_depth, depth)

    return {"shapes": shapes, "hierarchy_depth": max_depth, "total_contours": len(contours)}


def classify_shape(circularity: float, solidity: float, vertices: int, aspect: float) -> str:
    """Classify shape based on geometric properties."""
    if circularity > 0.85 and aspect < 1.15:
        return "circle"
    if circularity > 0.75 and aspect > 1.15:
        return "ellipse"
    if vertices == 3:
        return "triangle"
    if vertices == 4 and circularity < 0.7:
        return "rect"
    if 4 <= vertices <= 8 and 0.7 <= circularity <= 0.85:
        return "rounded_rect"
    if vertices > 8 and circularity > 0.7:
        return "rounded_rect"
    if solidity < 0.5:
        return "complex"
    return "polygon"


def estimate_corner_radius(contour: np.ndarray, rect_w: float, rect_h: float) -> float:
    """Estimate corner radius of a rounded rectangle by analyzing curvature at corners."""
    if len(contour) < 20:
        return 0

    points = contour.reshape(-1, 2).astype(np.float64)

    # Compute curvature at each point using 3-point circle fitting
    n = len(points)
    curvatures = []
    step = max(1, n // 100)  # sample for speed

    for i in range(0, n, step):
        p0 = points[(i - step * 3) % n]
        p1 = points[i]
        p2 = points[(i + step * 3) % n]

        # Triangle area * 2
        area2 = abs((p1[0] - p0[0]) * (p2[1] - p0[1]) - (p2[0] - p0[0]) * (p1[1] - p0[1]))

        d01 = np.linalg.norm(p1 - p0)
        d12 = np.linalg.norm(p2 - p1)
        d02 = np.linalg.norm(p2 - p0)

        denom = d01 * d12 * d02
        if denom > 0 and area2 > 0:
            radius = denom / (2 * area2)
            if radius < max(rect_w, rect_h):  # filter outliers
                curvatures.append(radius)

    if not curvatures:
        return 0

    # Corner radius is the most common small radius (exclude near-straight sections)
    curvatures = np.array(curvatures)
    # Filter: corner radii are typically 5-50% of the smaller dimension
    min_r = min(rect_w, rect_h) * 0.03
    max_r = min(rect_w, rect_h) * 0.6
    filtered = curvatures[(curvatures > min_r) & (curvatures < max_r)]

    if len(filtered) > 0:
        return float(np.median(filtered))
    return 0


def detect_concentric_pattern(shapes: list) -> dict:
    """Detect concentric pattern: shapes sharing center with decreasing size."""
    if len(shapes) < 3:
        return {"is_concentric": False}

    # Filter to similar shape types
    type_groups = {}
    for s in shapes:
        t = s["shape_type"]
        if t not in type_groups:
            type_groups[t] = []
        type_groups[t].append(s)

    best_group = None
    best_count = 0
    for t, group in type_groups.items():
        if len(group) > best_count:
            best_count = len(group)
            best_group = group

    if not best_group or len(best_group) < 3:
        return {"is_concentric": False}

    # Check if centers are clustered
    centers = np.array([s["center_px"] for s in best_group])
    center_spread = np.std(centers, axis=0)
    avg_size = np.mean([s["width_px"] for s in best_group])
    is_centered = all(s < avg_size * 0.15 for s in center_spread)

    if not is_centered:
        return {"is_concentric": False}

    # Sort by size descending
    sorted_shapes = sorted(best_group, key=lambda s: s["area_px"], reverse=True)

    # Compute scale ratios between consecutive shapes
    scale_ratios = []
    rotation_steps = []
    for i in range(len(sorted_shapes) - 1):
        w1 = sorted_shapes[i]["width_px"]
        w2 = sorted_shapes[i + 1]["width_px"]
        if w1 > 0:
            scale_ratios.append(round(w2 / w1, 4))

        r1 = sorted_shapes[i]["rotation_deg"]
        r2 = sorted_shapes[i + 1]["rotation_deg"]
        rot_diff = (r2 - r1) % 360
        if rot_diff > 180:
            rot_diff -= 360
        rotation_steps.append(round(rot_diff, 2))

    return {
        "is_concentric": True,
        "count": len(sorted_shapes),
        "shape_type": sorted_shapes[0]["shape_type"],
        "center_px": [round(float(centers.mean(axis=0)[0]), 1), round(float(centers.mean(axis=0)[1]), 1)],
        "center_spread_px": [round(float(center_spread[0]), 1), round(float(center_spread[1]), 1)],
        "scale_ratios": scale_ratios,
        "mean_scale_ratio": round(float(np.mean(scale_ratios)), 4) if scale_ratios else None,
        "scale_ratio_std": round(float(np.std(scale_ratios)), 4) if scale_ratios else None,
        "rotation_steps_deg": rotation_steps,
        "mean_rotation_step_deg": round(float(np.mean(rotation_steps)), 2) if rotation_steps else None,
        "rotation_step_std_deg": round(float(np.std(rotation_steps)), 2) if rotation_steps else None,
        "largest_size_normalized": [sorted_shapes[0]["width_normalized"], sorted_shapes[0]["height_normalized"]],
        "smallest_size_normalized": [sorted_shapes[-1]["width_normalized"], sorted_shapes[-1]["height_normalized"]],
    }


def measure_stroke_width_precise(img_bgr: np.ndarray) -> dict:
    """Measure stroke width using distance transform on edges."""
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape

    # Adaptive threshold to isolate strokes
    binary = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                    cv2.THRESH_BINARY_INV, 21, 5)

    # Distance transform
    dist = cv2.distanceTransform(binary, cv2.DIST_L2, 5)

    # Local maxima of distance transform = half stroke width
    # Find peaks
    dilated = cv2.dilate(dist, None, iterations=1)
    peaks = (dist == dilated) & (dist > 1)
    peak_values = dist[peaks]

    if len(peak_values) == 0:
        return {"stroke_widths_px": [], "note": "no strokes detected"}

    # Stroke width = 2 * distance at ridge
    stroke_widths = (peak_values * 2).tolist()

    # Cluster stroke widths to find distinct stroke sizes
    sw_arr = np.array(stroke_widths)
    median = float(np.median(sw_arr))
    mode_range = sw_arr[(sw_arr > median * 0.5) & (sw_arr < median * 2.0)]

    return {
        "median_stroke_width_px": round(float(np.median(mode_range)) if len(mode_range) > 0 else median, 2),
        "mean_stroke_width_px": round(float(np.mean(mode_range)) if len(mode_range) > 0 else float(np.mean(sw_arr)), 2),
        "stroke_width_ratio": round((float(np.median(mode_range)) if len(mode_range) > 0 else median) / w, 5),
        "distinct_widths": sorted(set(round(v, 1) for v in stroke_widths if abs(v - median) < median * 0.3))[:5],
        "sample_count": len(stroke_widths),
    }


def detect_symmetry(img_bgr: np.ndarray) -> dict:
    """Detect bilateral and rotational symmetry."""
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape
    gray_f = gray.astype(np.float64)

    # Bilateral X symmetry (left-right)
    left = gray_f[:, :w // 2]
    right = np.fliplr(gray_f[:, w - w // 2:])
    min_w = min(left.shape[1], right.shape[1])
    left, right = left[:, :min_w], right[:, :min_w]
    diff_x = np.mean(np.abs(left - right)) / 255.0
    sym_x = 1.0 - diff_x

    # Bilateral Y symmetry (top-bottom)
    top = gray_f[:h // 2, :]
    bottom = np.flipud(gray_f[h - h // 2:, :])
    min_h = min(top.shape[0], bottom.shape[0])
    top, bottom = top[:min_h, :], bottom[:min_h, :]
    diff_y = np.mean(np.abs(top - bottom)) / 255.0
    sym_y = 1.0 - diff_y

    # Rotational symmetry: compare image to 180° rotation
    rotated_180 = np.rot90(gray_f, 2)
    diff_180 = np.mean(np.abs(gray_f - rotated_180)) / 255.0
    sym_180 = 1.0 - diff_180

    # Classify
    threshold = 0.92
    has_x = sym_x > threshold
    has_y = sym_y > threshold
    has_180 = sym_180 > threshold

    if has_x and has_y:
        sym_type = "bilateral_xy"
    elif has_x:
        sym_type = "bilateral_x"
    elif has_y:
        sym_type = "bilateral_y"
    elif has_180:
        sym_type = "rotational_180"
    else:
        sym_type = "none"

    return {
        "type": sym_type,
        "bilateral_x_score": round(sym_x, 4),
        "bilateral_y_score": round(sym_y, 4),
        "rotational_180_score": round(sym_180, 4),
    }


def analyze_frame(frame_path: str) -> dict:
    """Full geometry analysis of a single frame."""
    img = cv2.imread(frame_path)
    if img is None:
        return {"error": f"Cannot read {frame_path}"}

    h, w = img.shape[:2]

    # Shape detection
    shape_data = detect_shapes(img)

    # Concentric pattern detection
    concentric = detect_concentric_pattern(shape_data["shapes"])

    # Precise stroke measurement
    stroke = measure_stroke_width_precise(img)

    # Symmetry detection
    symmetry = detect_symmetry(img)

    return {
        "frame": os.path.basename(frame_path),
        "resolution": {"width": w, "height": h},
        "shapes": shape_data["shapes"][:50],  # limit output
        "shape_count": len(shape_data["shapes"]),
        "hierarchy_depth": shape_data["hierarchy_depth"],
        "total_contours": shape_data.get("total_contours", 0),
        "concentric_pattern": concentric,
        "stroke_measurement": stroke,
        "symmetry": symmetry,
    }


def main():
    parser = argparse.ArgumentParser(description="Analyze geometry from extracted video frames")
    parser.add_argument("frames_dir", help="Directory containing extracted frames")
    parser.add_argument("--frame-index", type=int, default=-1,
                       help="Analyze specific frame index (-1 = analyze 3 representative frames)")
    args = parser.parse_args()

    frames_dir = Path(args.frames_dir)
    frame_files = sorted(frames_dir.glob("frame_*.png"))
    if not frame_files:
        print(f"No frame_*.png files found in {frames_dir}", file=sys.stderr)
        sys.exit(1)

    # Select frames to analyze
    if args.frame_index >= 0:
        indices = [args.frame_index]
    else:
        # Analyze 3 representative frames: start, middle, near-end
        n = len(frame_files)
        indices = [0, n // 2, n - 1] if n >= 3 else list(range(n))

    print(f"Analyzing geometry in {len(indices)} frames...")

    analyses = []
    for idx in indices:
        if idx >= len(frame_files):
            continue
        frame_path = str(frame_files[idx])
        print(f"  [{idx}] {frame_files[idx].name}")
        result = analyze_frame(frame_path)
        analyses.append(result)

    # Cross-frame consistency check
    consistency = {}
    if len(analyses) > 1:
        shape_counts = [a["shape_count"] for a in analyses]
        consistency = {
            "shape_count_range": [min(shape_counts), max(shape_counts)],
            "shape_count_consistent": max(shape_counts) - min(shape_counts) < 3,
        }

        # Compare concentric patterns
        concentric_counts = [
            a["concentric_pattern"].get("count", 0)
            for a in analyses
            if a["concentric_pattern"].get("is_concentric")
        ]
        if concentric_counts:
            consistency["concentric_count_range"] = [min(concentric_counts), max(concentric_counts)]

    output = {
        "frame_analyses": analyses,
        "cross_frame_consistency": consistency,
        "analysis_params": {
            "frames_analyzed": len(analyses),
            "frame_indices": indices,
            "opencv_version": cv2.__version__,
        },
    }

    def numpy_safe(obj):
        if isinstance(obj, (np.integer,)):
            return int(obj)
        if isinstance(obj, (np.floating,)):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")

    out_path = frames_dir / "geometry.json"
    with open(out_path, "w") as f:
        json.dump(output, f, indent=2, default=numpy_safe)
    print(f"\nResults -> {out_path}")

    # Summary
    for a in analyses:
        cp = a["concentric_pattern"]
        print(f"\n  {a['frame']}:")
        print(f"    Shapes: {a['shape_count']}, Hierarchy depth: {a['hierarchy_depth']}")
        print(f"    Symmetry: {a['symmetry']['type']}")
        if cp.get("is_concentric"):
            print(f"    Concentric: {cp['count']} {cp['shape_type']}s")
            print(f"    Scale ratio: {cp.get('mean_scale_ratio', '?')} (std={cp.get('scale_ratio_std', '?')})")
            print(f"    Rotation step: {cp.get('mean_rotation_step_deg', '?')}° (std={cp.get('rotation_step_std_deg', '?')}°)")
        stroke = a["stroke_measurement"]
        if stroke.get("median_stroke_width_px"):
            print(f"    Stroke: {stroke['median_stroke_width_px']}px (ratio={stroke.get('stroke_width_ratio', '?')})")


if __name__ == "__main__":
    main()