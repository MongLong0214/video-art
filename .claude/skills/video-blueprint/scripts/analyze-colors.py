#!/usr/bin/env python3
"""
Precise color palette extraction from video frames.

Extracts exact hex colors via pixel sampling + k-means clustering.
Also analyzes spatial distribution of colors (center vs edge, stroke vs fill).

Usage:
  python analyze-colors.py <frames_dir> [--top N] [--sample-density N]

Dependencies: Pillow, numpy, scikit-learn (optional, falls back to manual clustering)

Output: colors.json in the frames directory
"""

import argparse
import json
import os
import sys
from collections import Counter
from pathlib import Path

try:
    from PIL import Image
    import numpy as np
except ImportError:
    print("Error: Pillow and numpy are required.\n  pip install Pillow numpy", file=sys.stderr)
    sys.exit(1)

try:
    from sklearn.cluster import KMeans
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False

try:
    from colorspacious import deltaE as _deltaE_colorspacious
    HAS_COLORSPACIOUS = True
except ImportError:
    HAS_COLORSPACIOUS = False

try:
    from skimage.color import rgb2lab as _skimage_rgb2lab
    HAS_SKIMAGE = True
except ImportError:
    HAS_SKIMAGE = False


def rgb_to_lab(r: int, g: int, b: int) -> list:
    """Convert RGB (0-255) to CIELAB [L, a, b]."""
    if HAS_SKIMAGE:
        pixel = np.array([[[r, g, b]]], dtype=np.uint8)
        lab = _skimage_rgb2lab(pixel)[0, 0]
        return [round(float(lab[0]), 2), round(float(lab[1]), 2), round(float(lab[2]), 2)]
    # Manual fallback via XYZ
    rgb_n = np.array([r, g, b], dtype=np.float64) / 255.0
    rgb_n = np.where(rgb_n > 0.04045, ((rgb_n + 0.055) / 1.055) ** 2.4, rgb_n / 12.92)
    mat = np.array([[0.4124564, 0.3575761, 0.1804375],
                    [0.2126729, 0.7151522, 0.0721750],
                    [0.0193339, 0.1191920, 0.9503041]])
    xyz = mat @ rgb_n
    ref = np.array([0.95047, 1.00000, 1.08883])
    xyz_n = xyz / ref
    xyz_n = np.where(xyz_n > 0.008856, xyz_n ** (1/3), 7.787 * xyz_n + 16/116)
    L = 116 * xyz_n[1] - 16
    a = 500 * (xyz_n[0] - xyz_n[1])
    b_val = 200 * (xyz_n[1] - xyz_n[2])
    return [round(float(L), 2), round(float(a), 2), round(float(b_val), 2)]


def compute_delta_e2000(lab1, lab2) -> float:
    """Compute ΔE2000 between two CIELAB colors."""
    if HAS_COLORSPACIOUS:
        return float(_deltaE_colorspacious(np.array(lab1), np.array(lab2), input_space="CIELab"))
    # Simplified ΔE76 fallback
    return float(np.sqrt(sum((a - b) ** 2 for a, b in zip(lab1, lab2))))


def rgb_to_hex(r: int, g: int, b: int) -> str:
    return f"#{r:02X}{g:02X}{b:02X}"



def color_distance(c1, c2) -> float:
    """Euclidean distance in RGB space."""
    return sum((a - b) ** 2 for a, b in zip(c1, c2)) ** 0.5


def color_name_hint(r: int, g: int, b: int) -> str:
    """Provide a rough color name for identification."""
    h, s, v = rgb_to_hsv(r, g, b)
    if v < 30:
        return "near_black"
    if s < 20 and v > 200:
        return "near_white"
    if s < 30:
        return "gray"

    if h < 15 or h >= 345:
        return "red"
    if h < 45:
        return "orange" if s > 50 else "brown"
    if h < 70:
        return "yellow" if v > 120 else "olive"
    if h < 165:
        return "green"
    if h < 195:
        return "cyan"
    if h < 260:
        return "blue"
    if h < 290:
        return "purple"
    return "magenta"


def rgb_to_hsv(r: int, g: int, b: int) -> tuple:
    """Convert RGB (0-255) to HSV (H: 0-360, S: 0-100, V: 0-255)."""
    r_, g_, b_ = r / 255.0, g / 255.0, b / 255.0
    mx, mn = max(r_, g_, b_), min(r_, g_, b_)
    diff = mx - mn

    if diff == 0:
        h = 0
    elif mx == r_:
        h = (60 * ((g_ - b_) / diff) + 360) % 360
    elif mx == g_:
        h = (60 * ((b_ - r_) / diff) + 120) % 360
    else:
        h = (60 * ((r_ - g_) / diff) + 240) % 360

    s = 0 if mx == 0 else (diff / mx) * 100
    v = mx * 255
    return (round(h), round(s), round(v))


def simple_kmeans(pixels: np.ndarray, k: int, max_iter: int = 30) -> np.ndarray:
    """Simple k-means without sklearn. Returns cluster centers.
    Uses chunked distance computation to avoid OOM on large inputs."""
    rng = np.random.default_rng(42)
    # Subsample if too many pixels to avoid memory issues
    max_pixels = 50_000
    if len(pixels) > max_pixels:
        sample_idx = rng.choice(len(pixels), size=max_pixels, replace=False)
        sample = pixels[sample_idx].astype(np.float64)
    else:
        sample = pixels.astype(np.float64)

    indices = rng.choice(len(sample), size=k, replace=False)
    centers = sample[indices].copy()

    for _ in range(max_iter):
        # Assign clusters via chunked computation
        labels = np.empty(len(sample), dtype=np.int32)
        chunk_size = 10_000
        for start in range(0, len(sample), chunk_size):
            end = min(start + chunk_size, len(sample))
            dists = np.linalg.norm(sample[start:end, None] - centers[None, :], axis=2)
            labels[start:end] = np.argmin(dists, axis=1)

        # Update centers
        new_centers = np.zeros_like(centers)
        for j in range(k):
            mask = labels == j
            if mask.any():
                new_centers[j] = sample[mask].mean(axis=0)
            else:
                new_centers[j] = centers[j]

        if np.allclose(centers, new_centers, atol=1):
            break
        centers = new_centers

    return np.round(centers).astype(int)


def cluster_colors(pixels: np.ndarray, n_clusters: int) -> list:
    """Cluster pixel colors and return sorted by frequency."""
    if HAS_SKLEARN:
        km = KMeans(n_clusters=n_clusters, random_state=42, n_init=10, max_iter=100)
        km.fit(pixels)
        centers = np.round(km.cluster_centers_).astype(int)
        labels = km.labels_
    else:
        centers = simple_kmeans(pixels, n_clusters)
        dists = np.linalg.norm(pixels[:, None] - centers[None, :], axis=2)
        labels = np.argmin(dists, axis=1)

    # Count per cluster
    counts = Counter(labels)
    total = len(labels)

    results = []
    for i in range(n_clusters):
        r, g, b = int(centers[i][0]), int(centers[i][1]), int(centers[i][2])
        r, g, b = max(0, min(255, r)), max(0, min(255, g)), max(0, min(255, b))
        count = counts.get(i, 0)
        results.append({
            "hex": rgb_to_hex(r, g, b),
            "rgb": [r, g, b],
            "lab": rgb_to_lab(r, g, b),
            "hsv": list(rgb_to_hsv(r, g, b)),
            "percentage": round(count / total * 100, 2),
            "pixel_count": count,
            "name_hint": color_name_hint(r, g, b),
        })

    results.sort(key=lambda x: x["pixel_count"], reverse=True)
    return results



def analyze_spatial_distribution(img: Image.Image, palette: list) -> dict:
    """Analyze where each palette color appears spatially."""
    w, h = img.size
    pixels = np.array(img).reshape(-1, 3)

    distribution = {}
    for color_info in palette:
        r, g, b = color_info["rgb"]
        target = np.array([r, g, b])

        # Find pixels close to this color (within threshold)
        dists = np.linalg.norm(pixels.astype(float) - target.astype(float), axis=1)
        threshold = 40  # RGB distance
        mask = dists < threshold

        if mask.sum() == 0:
            distribution[color_info["hex"]] = {"role_hint": "accent", "spatial": "scattered"}
            continue

        # Get coordinates of matching pixels
        coords = np.where(mask.reshape(h, w))
        y_coords = coords[0] / h
        x_coords = coords[1] / w

        # Compute centroid and spread
        cy, cx = y_coords.mean(), x_coords.mean()
        spread_y, spread_x = y_coords.std(), x_coords.std()

        # Compute radial distance from center
        radial = np.sqrt((x_coords - 0.5) ** 2 + (y_coords - 0.5) ** 2)
        mean_radial = radial.mean()

        role = "unknown"
        if color_info["percentage"] > 40:
            role = "background"
        elif mean_radial > 0.35:
            role = "edge_effect"
        elif spread_x > 0.3 and spread_y > 0.3:
            role = "distributed_stroke"
        elif spread_x < 0.15 and spread_y < 0.15:
            role = "localized_accent"
        else:
            role = "stroke"

        distribution[color_info["hex"]] = {
            "role_hint": role,
            "centroid": [round(cx, 3), round(cy, 3)],
            "spread": [round(spread_x, 3), round(spread_y, 3)],
            "mean_radial_distance": round(mean_radial, 3),
            "pixel_coverage": round(mask.sum() / len(mask) * 100, 2),
        }

    return distribution


def analyze_edges_for_stroke(img: Image.Image) -> dict:
    """Detect stroke width by analyzing edge transitions."""
    gray = np.array(img.convert("L"), dtype=np.float64)
    h, w = gray.shape

    # Sobel-like gradient magnitude
    gx = np.abs(np.diff(gray, axis=1))
    gy = np.abs(np.diff(gray, axis=0))

    # Find high-gradient pixels (edges)
    threshold = np.percentile(gx, 95)
    edge_mask_x = gx > threshold

    # Estimate stroke width by measuring edge-to-edge distances
    # Sample horizontal scan lines through center
    stroke_widths = []
    for y in range(h // 4, 3 * h // 4, max(1, h // 50)):
        if y >= edge_mask_x.shape[0]:
            continue
        line = edge_mask_x[y]
        edges = np.where(line)[0]
        if len(edges) >= 2:
            diffs = np.diff(edges)
            # Small gaps between edges = stroke width
            small_gaps = diffs[(diffs > 1) & (diffs < w * 0.05)]
            stroke_widths.extend(small_gaps.tolist())

    if stroke_widths:
        median_stroke = float(np.median(stroke_widths))
        return {
            "estimated_stroke_width_px": round(median_stroke, 1),
            "estimated_stroke_width_ratio": round(median_stroke / w, 5),
            "stroke_width_std_px": round(float(np.std(stroke_widths)), 1),
            "sample_count": len(stroke_widths),
        }
    return {"estimated_stroke_width_px": 0, "note": "no clear strokes detected"}


def analyze_frame(frame_path: str, n_clusters: int, sample_density: int) -> dict:
    """Full color analysis of a single frame."""
    img = Image.open(frame_path).convert("RGB")
    w, h = img.size

    # Downsample for clustering (speed)
    max_dim = sample_density
    if w > max_dim or h > max_dim:
        ratio = max_dim / max(w, h)
        img_small = img.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)
    else:
        img_small = img

    pixels = np.array(img_small).reshape(-1, 3)

    # Cluster colors
    palette = cluster_colors(pixels, n_clusters)

    # Spatial distribution
    distribution = analyze_spatial_distribution(img, palette)

    # Stroke analysis
    stroke_info = analyze_edges_for_stroke(img)

    return {
        "frame": os.path.basename(frame_path),
        "resolution": {"width": w, "height": h},
        "palette": palette,
        "spatial_distribution": distribution,
        "stroke_analysis": stroke_info,
    }


def merge_palettes(frame_analyses: list, tolerance: int = 25, use_lab: bool = False,
                    low_contrast: bool = False) -> list:
    """Merge palettes across frames to find the canonical palette.
    If use_lab=True, tolerance is interpreted as ΔE2000 threshold (default 15).
    If low_contrast=True, tolerance is widened for dark/low-contrast videos."""
    if low_contrast and not use_lab:
        tolerance = int(tolerance * 1.4)  # widen RGB tolerance from 25 to ~35
    all_colors = []
    for analysis in frame_analyses:
        for color in analysis["palette"]:
            all_colors.append(color)

    # Group similar colors
    groups = []
    for color in all_colors:
        rgb = color["rgb"]
        lab = color.get("lab") or rgb_to_lab(*rgb)
        found = False
        for group in groups:
            if use_lab:
                group_lab = group.get("lab_avg") or rgb_to_lab(*[int(v) for v in group["rgb_sum"]])
                dist = compute_delta_e2000(lab, group_lab)
            else:
                dist = color_distance(rgb, group["rgb_sum"])
            if dist < tolerance:
                group["members"].append(color)
                n = len(group["members"])
                group["rgb_sum"] = [
                    (group["rgb_sum"][i] * (n - 1) + rgb[i]) / n
                    for i in range(3)
                ]
                group["lab_avg"] = [
                    (group.get("lab_avg", lab)[i] * (n - 1) + lab[i]) / n
                    for i in range(3)
                ]
                found = True
                break
        if not found:
            groups.append({"rgb_sum": list(rgb), "lab_avg": list(lab), "members": [color]})

    # Compute canonical color for each group
    canonical = []
    for group in groups:
        members = group["members"]
        avg_rgb = [int(round(sum(m["rgb"][i] for m in members) / len(members))) for i in range(3)]
        avg_rgb = [max(0, min(255, v)) for v in avg_rgb]
        avg_pct = sum(m["percentage"] for m in members) / len(members)
        canonical.append({
            "hex": rgb_to_hex(*avg_rgb),
            "rgb": avg_rgb,
            "lab": rgb_to_lab(*avg_rgb),
            "hsv": list(rgb_to_hsv(*avg_rgb)),
            "avg_percentage": round(avg_pct, 2),
            "consistency": round(len(members) / len(frame_analyses) * 100, 1),
            "name_hint": color_name_hint(*avg_rgb),
            "frame_count": len(members),
        })

    canonical.sort(key=lambda x: x["avg_percentage"], reverse=True)
    return canonical


def main():
    parser = argparse.ArgumentParser(description="Analyze colors from extracted video frames")
    parser.add_argument("frames_dir", help="Directory containing extracted frames")
    parser.add_argument("--top", type=int, default=12, help="Max colors to detect per frame (default: 12)")
    parser.add_argument("--sample-density", type=int, default=512, help="Downsample max dimension for clustering (default: 512)")
    args = parser.parse_args()

    frames_dir = Path(args.frames_dir)
    if not frames_dir.is_dir():
        print(f"Directory not found: {frames_dir}", file=sys.stderr)
        sys.exit(1)

    # Find frame files
    frame_files = sorted(frames_dir.glob("frame_*.png"))
    if not frame_files:
        print(f"No frame_*.png files found in {frames_dir}", file=sys.stderr)
        sys.exit(1)

    print(f"Analyzing colors in {len(frame_files)} frames...")

    # E1: Detect dark/low-contrast video
    low_contrast = False
    try:
        first_img = np.array(Image.open(str(frame_files[0])).convert("L"))
        mean_brightness = float(first_img.mean())
        if mean_brightness < 30:
            print(f"  Warning: Very dark video detected (mean brightness: {mean_brightness:.1f}/255). "
                  "Adjusting color tolerance.", file=sys.stderr)
            low_contrast = True
    except Exception:
        pass

    frame_analyses = []
    for i, frame_path in enumerate(frame_files):
        print(f"  [{i+1}/{len(frame_files)}] {frame_path.name}")
        analysis = analyze_frame(str(frame_path), args.top, args.sample_density)
        frame_analyses.append(analysis)

    # Merge across frames
    canonical_palette = merge_palettes(frame_analyses, low_contrast=low_contrast)

    # Aggregate stroke info
    stroke_widths = [
        a["stroke_analysis"]["estimated_stroke_width_px"]
        for a in frame_analyses
        if a["stroke_analysis"].get("estimated_stroke_width_px", 0) > 0
    ]
    stroke_summary = {}
    if stroke_widths:
        stroke_summary = {
            "median_stroke_width_px": round(float(np.median(stroke_widths)), 1),
            "mean_stroke_width_px": round(float(np.mean(stroke_widths)), 1),
            "std_stroke_width_px": round(float(np.std(stroke_widths)), 1),
            "stroke_width_ratio": round(float(np.median(stroke_widths)) / frame_analyses[0]["resolution"]["width"], 5),
        }

    analysis_params = {
        "clusters_per_frame": args.top,
        "sample_density": args.sample_density,
        "sklearn_available": HAS_SKLEARN,
        "frames_analyzed": len(frame_files),
    }
    if low_contrast:
        analysis_params["low_contrast_warning"] = True

    result = {
        "canonical_palette": canonical_palette,
        "stroke_summary": stroke_summary,
        "per_frame_analyses": frame_analyses,
        "analysis_params": analysis_params,
    }

    out_path = frames_dir / "colors.json"
    with open(out_path, "w") as f:
        json.dump(result, f, indent=2)
    print(f"\nResults -> {out_path}")
    print(f"\nCanonical palette ({len(canonical_palette)} colors):")
    for c in canonical_palette:
        print(f"  {c['hex']}  {c['avg_percentage']:5.1f}%  {c['name_hint']:<12} (in {c['frame_count']}/{len(frame_files)} frames)")


if __name__ == "__main__":
    main()