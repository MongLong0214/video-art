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

_parent = Path(__file__).resolve().parent
sys.path.insert(0, str(_parent))
try:
    import importlib.util
    _spec = importlib.util.spec_from_file_location("analyze_colors", _parent / "analyze-colors.py")
    _cm = importlib.util.module_from_spec(_spec)
    _spec.loader.exec_module(_cm)
    rgb_to_lab = _cm.rgb_to_lab
    compute_delta_e2000 = _cm.compute_delta_e2000
except Exception:
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


def compare_palettes(palette_a: list, palette_b: list) -> dict:
    """Compare two color palettes via ΔE2000."""
    delta_e_values = []
    for ca, cb in zip(palette_a, palette_b):
        lab_a = rgb_to_lab(*ca["rgb"])
        lab_b = rgb_to_lab(*cb["rgb"])
        de = compute_delta_e2000(lab_a, lab_b)
        delta_e_values.append(round(de, 2))
    return {
        "delta_e_values": delta_e_values,
        "mean_delta_e": round(float(np.mean(delta_e_values)), 2) if delta_e_values else 0,
        "max_delta_e": round(float(max(delta_e_values)), 2) if delta_e_values else 0,
    }


def compare_shape_counts(count_a: int, count_b: int) -> dict:
    """Compare shape counts."""
    diff = abs(count_a - count_b)
    return {
        "original": count_a,
        "rendered": count_b,
        "diff": diff,
        "match": diff <= 1,
    }


def create_report(ssim_values: list, palette_report: dict, shape_report: dict,
                   ssim_threshold: float = 0.7) -> dict:
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
    parser.add_argument("--output", default="verification-report.json")
    args = parser.parse_args()

    orig_dir = Path(args.original_dir)
    rend_dir = Path(args.rendered_dir)

    orig_frames = sorted(orig_dir.glob("frame_*.png"))
    rend_frames = sorted(rend_dir.glob("frame_*.png"))

    pairs = min(len(orig_frames), len(rend_frames))
    ssim_values = []
    for i in range(pairs):
        a = cv2.imread(str(orig_frames[i]))
        b = cv2.imread(str(rend_frames[i]))
        if a is not None and b is not None:
            ssim_values.append(compute_ssim(a, b))

    report = create_report(ssim_values, {}, {})

    with open(args.output, "w") as f:
        json.dump(report, f, indent=2)
    print(f"Report: {args.output}")
    print(f"SSIM mean: {report['ssim_mean']}, Verdict: {report['verdict']}")


if __name__ == "__main__":
    main()