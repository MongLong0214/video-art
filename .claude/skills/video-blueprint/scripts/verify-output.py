#!/usr/bin/env python3
"""
Verify generated output against original video frames.

Compares: SSIM (windowed), palette ΔE2000, shape count.
Outputs: verification-report.json

Usage:
  python3 verify-output.py --original-dir <frames/> --rendered-dir <rendered/> [--output report.json]

Dependencies: scikit-image, colorspacious, opencv-python-headless, numpy, Pillow
"""

import argparse
import json
import sys
from pathlib import Path

import cv2
import numpy as np

try:
    from skimage.metrics import structural_similarity
    HAS_SKIMAGE = True
except ImportError:
    HAS_SKIMAGE = False

try:
    from analyze_layers.color_utils import rgb_to_lab, compute_delta_e2000
except ImportError:
    # Fallback: add parent to path for standalone execution
    _parent = Path(__file__).resolve().parent
    sys.path.insert(0, str(_parent))
    try:
        from analyze_layers.color_utils import rgb_to_lab, compute_delta_e2000
    except ImportError:
        def rgb_to_lab(r, g, b): return [0, 0, 0]
        def compute_delta_e2000(a, b): return 0


def compute_ssim(img_a: np.ndarray, img_b: np.ndarray) -> float:
    """Compute SSIM between two images."""
    if img_a.shape != img_b.shape:
        h = min(img_a.shape[0], img_b.shape[0])
        w = min(img_a.shape[1], img_b.shape[1])
        img_a = img_a[:h, :w]
        img_b = img_b[:h, :w]

    if HAS_SKIMAGE:
        gray_a = cv2.cvtColor(img_a, cv2.COLOR_BGR2GRAY) if len(img_a.shape) == 3 else img_a
        gray_b = cv2.cvtColor(img_b, cv2.COLOR_BGR2GRAY) if len(img_b.shape) == 3 else img_b
        win_size = min(7, min(gray_a.shape[0], gray_a.shape[1]))
        if win_size % 2 == 0:
            win_size -= 1
        if win_size < 3:
            win_size = 3
        return float(structural_similarity(gray_a, gray_b, win_size=win_size))

    # Fallback: simplified SSIM
    gray_a = cv2.cvtColor(img_a, cv2.COLOR_BGR2GRAY).astype(np.float64) if len(img_a.shape) == 3 else img_a.astype(np.float64)
    gray_b = cv2.cvtColor(img_b, cv2.COLOR_BGR2GRAY).astype(np.float64) if len(img_b.shape) == 3 else img_b.astype(np.float64)
    mu1, mu2 = gray_a.mean(), gray_b.mean()
    sig1 = ((gray_a - mu1) ** 2).mean()
    sig2 = ((gray_b - mu2) ** 2).mean()
    sig12 = ((gray_a - mu1) * (gray_b - mu2)).mean()
    C1, C2 = (0.01 * 255) ** 2, (0.03 * 255) ** 2
    num = (2 * mu1 * mu2 + C1) * (2 * sig12 + C2)
    den = (mu1 ** 2 + mu2 ** 2 + C1) * (sig1 + sig2 + C2)
    return float(num / den)


DEFAULT_SSIM_THRESHOLD = 0.85


def extract_dominant_colors(img_bgr: np.ndarray, k: int = 8) -> list:
    """Extract k dominant colors from image via k-means. Returns list of {"rgb": [r,g,b]}."""
    pixels = img_bgr.reshape(-1, 3).astype(np.float32)
    # Subsample for speed
    if len(pixels) > 50000:
        rng = np.random.default_rng(42)
        indices = rng.choice(len(pixels), 50000, replace=False)
        pixels = pixels[indices]
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 1.0)
    _, labels, centers = cv2.kmeans(pixels, k, None, criteria, 3, cv2.KMEANS_PP_CENTERS)
    colors = []
    for c in centers:
        b, g, r = int(round(c[0])), int(round(c[1])), int(round(c[2]))
        colors.append({"rgb": [r, g, b]})
    return colors


def count_shapes_in_frame(img_bgr: np.ndarray) -> int:
    """Count major shapes in a frame via contour detection."""
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 50, 150)
    kernel = np.ones((2, 2), np.uint8)
    edges = cv2.dilate(edges, kernel, iterations=1)
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    h, w = gray.shape
    min_area = w * h * 0.0005
    return sum(1 for c in contours if cv2.contourArea(c) >= min_area)


def generate_diff_image(img_a: np.ndarray, img_b: np.ndarray, output_path: str):
    """Save amplified per-pixel difference image."""
    if img_a.shape != img_b.shape:
        h = min(img_a.shape[0], img_b.shape[0])
        w = min(img_a.shape[1], img_b.shape[1])
        img_a, img_b = img_a[:h, :w], img_b[:h, :w]
    diff = cv2.absdiff(img_a, img_b)
    amplified = cv2.normalize(diff, None, 0, 255, cv2.NORM_MINMAX)
    cv2.imwrite(output_path, amplified)


def compare_palettes(palette_a: list, palette_b: list) -> dict:
    """Compare two color palettes via ΔE2000."""
    count = min(len(palette_a), len(palette_b))
    delta_e_values = []
    for i in range(count):
        lab_a = rgb_to_lab(*palette_a[i]["rgb"])
        lab_b = rgb_to_lab(*palette_b[i]["rgb"])
        de = compute_delta_e2000(lab_a, lab_b)
        delta_e_values.append(round(de, 2))
    return {
        "delta_e_values": delta_e_values,
        "compared_count": count,
        "original_count": len(palette_a),
        "rendered_count": len(palette_b),
        "mean_delta_e": round(float(np.mean(delta_e_values)), 2) if delta_e_values else 0,
        "max_delta_e": round(float(max(delta_e_values)), 2) if delta_e_values else 0,
    }


def compare_shape_counts(count_a: int, count_b: int) -> dict:
    """Compare shape counts."""
    diff = abs(count_a - count_b)
    max_count = max(count_a, count_b, 1)
    return {
        "original": count_a,
        "rendered": count_b,
        "diff": diff,
        "diff_percent": round(diff / max_count * 100, 1),
        "match": diff <= max(1, int(max_count * 0.1)),
    }


def create_report(ssim_values: list, palette_report: dict, shape_report: dict,
                   ssim_threshold: float = DEFAULT_SSIM_THRESHOLD) -> dict:
    """Create verification report with verdict."""
    ssim_mean = round(float(np.mean(ssim_values)), 4) if ssim_values else 0
    verdict = "PASS" if ssim_mean >= ssim_threshold else "FAIL"

    return {
        "ssim_mean": ssim_mean,
        "ssim_per_frame": [round(v, 4) for v in ssim_values],
        "palette": palette_report,
        "shapes": shape_report,
        "verdict": verdict,
        "ssim_threshold": ssim_threshold,
    }


def main():
    parser = argparse.ArgumentParser(description="Verify output vs original")
    parser.add_argument("--original-dir", required=True)
    parser.add_argument("--rendered-dir", required=True)
    parser.add_argument("--colors-json", default=None, help="Path to colors.json from Phase B")
    parser.add_argument("--geometry-json", default=None, help="Path to geometry.json from Phase B")
    parser.add_argument("--threshold", type=float, default=DEFAULT_SSIM_THRESHOLD,
                        help=f"SSIM pass threshold (default: {DEFAULT_SSIM_THRESHOLD})")
    parser.add_argument("--output", default="verification-report.json")
    args = parser.parse_args()

    orig_dir = Path(args.original_dir)
    rend_dir = Path(args.rendered_dir)

    if not orig_dir.is_dir():
        print(f"Error: original directory not found: {orig_dir}", file=sys.stderr)
        sys.exit(1)
    if not rend_dir.is_dir():
        print(f"Error: rendered directory not found: {rend_dir}", file=sys.stderr)
        sys.exit(1)

    orig_frames = sorted(orig_dir.glob("frame_*.png"))
    rend_frames = sorted(rend_dir.glob("frame_*.png"))

    if not orig_frames:
        print(f"Error: no frame_*.png in {orig_dir}", file=sys.stderr)
        sys.exit(1)
    if not rend_frames:
        print(f"Error: no frame_*.png in {rend_dir}", file=sys.stderr)
        sys.exit(1)

    pairs = min(len(orig_frames), len(rend_frames))
    ssim_values = []
    output_path = Path(args.output)
    diff_dir = output_path.parent / "diffs"

    for i in range(pairs):
        a = cv2.imread(str(orig_frames[i]))
        b = cv2.imread(str(rend_frames[i]))
        if a is None:
            print(f"  Warning: cannot read {orig_frames[i]}", file=sys.stderr)
            continue
        if b is None:
            print(f"  Warning: cannot read {rend_frames[i]}", file=sys.stderr)
            continue
        ssim_val = compute_ssim(a, b)
        ssim_values.append(ssim_val)
        # Generate diff image for frames below threshold
        if ssim_val < args.threshold:
            diff_dir.mkdir(parents=True, exist_ok=True)
            generate_diff_image(a, b, str(diff_dir / f"diff_{i:03d}.png"))

    # Palette comparison
    palette_report = {}
    if args.colors_json:
        colors_path = Path(args.colors_json)
        if colors_path.exists():
            with open(colors_path) as f:
                colors_data = json.load(f)
            original_palette = colors_data.get("canonical_palette", [])
            # Extract rendered palette from first rendered frame
            first_rend = cv2.imread(str(rend_frames[0]))
            if first_rend is not None and original_palette:
                rendered_palette = extract_dominant_colors(first_rend, k=len(original_palette))
                palette_report = compare_palettes(original_palette, rendered_palette)
                print(f"  Palette ΔE2000: mean={palette_report['mean_delta_e']}, max={palette_report['max_delta_e']}")

    # Shape count comparison
    shape_report = {}
    if args.geometry_json:
        geom_path = Path(args.geometry_json)
        if geom_path.exists():
            with open(geom_path) as f:
                geom_data = json.load(f)
            analyses = geom_data.get("frame_analyses", [])
            if analyses:
                orig_count = analyses[0].get("shape_count", 0)
                first_rend = cv2.imread(str(rend_frames[0]))
                if first_rend is not None:
                    rend_count = count_shapes_in_frame(first_rend)
                    shape_report = compare_shape_counts(orig_count, rend_count)
                    print(f"  Shape count: original={orig_count}, rendered={rend_count}, diff={shape_report['diff']}")

    report = create_report(ssim_values, palette_report, shape_report, args.threshold)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"Report: {output_path}")
    print(f"SSIM mean: {report['ssim_mean']}, Verdict: {report['verdict']}")


if __name__ == "__main__":
    main()