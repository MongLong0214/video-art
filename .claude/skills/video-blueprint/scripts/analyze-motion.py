#!/usr/bin/env python3
"""
Precise motion analysis between video frames.

Detects: rotation, translation, scale change, and classifies motion type.
Uses optical flow (OpenCV) and feature matching for sub-pixel accuracy.

Usage:
  python analyze-motion.py <frames_dir>

Dependencies: opencv-python-headless, numpy

Output: motion.json in the frames directory
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


def compute_frame_diff(img1: np.ndarray, img2: np.ndarray) -> dict:
    """Compute basic frame difference metrics."""
    gray1 = cv2.cvtColor(img1, cv2.COLOR_BGR2GRAY).astype(np.float64)
    gray2 = cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY).astype(np.float64)

    diff = np.abs(gray1 - gray2)
    mean_diff = float(diff.mean()) / 255.0
    max_diff = float(diff.max()) / 255.0

    # Where did change happen? (spatial distribution)
    h, w = gray1.shape
    threshold = 10  # pixel intensity difference
    changed_mask = diff > threshold
    changed_ratio = float(changed_mask.sum()) / (h * w)

    # Compute centroid of changes
    if changed_mask.any():
        ys, xs = np.where(changed_mask)
        change_centroid = [float(xs.mean()) / w, float(ys.mean()) / h]
        change_spread = [float(xs.std()) / w, float(ys.std()) / h]
    else:
        change_centroid = [0.5, 0.5]
        change_spread = [0, 0]

    return {
        "mean_diff": round(mean_diff, 6),
        "max_diff": round(max_diff, 4),
        "changed_pixel_ratio": round(changed_ratio, 4),
        "change_centroid": [round(v, 4) for v in change_centroid],
        "change_spread": [round(v, 4) for v in change_spread],
    }


def estimate_rotation_affine(img1: np.ndarray, img2: np.ndarray) -> dict:
    """Estimate rotation between frames using feature matching + affine transform."""
    gray1 = cv2.cvtColor(img1, cv2.COLOR_BGR2GRAY)
    gray2 = cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY)

    # Detect ORB features
    orb = cv2.ORB_create(nfeatures=1000)
    kp1, des1 = orb.detectAndCompute(gray1, None)
    kp2, des2 = orb.detectAndCompute(gray2, None)

    if des1 is None or des2 is None or len(kp1) < 10 or len(kp2) < 10:
        return {"method": "orb", "success": False, "reason": "insufficient_features"}

    # Match features
    bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=False)
    matches = bf.knnMatch(des1, des2, k=2)

    # Lowe's ratio test
    good_matches = []
    for m_pair in matches:
        if len(m_pair) == 2:
            m, n = m_pair
            if m.distance < 0.75 * n.distance:
                good_matches.append(m)

    if len(good_matches) < 6:
        return {"method": "orb", "success": False, "reason": "insufficient_good_matches",
                "match_count": len(good_matches)}

    # Get matched points
    pts1 = np.float32([kp1[m.queryIdx].pt for m in good_matches])
    pts2 = np.float32([kp2[m.trainIdx].pt for m in good_matches])

    # Estimate affine transform (rotation + translation + scale)
    M, inliers = cv2.estimateAffinePartial2D(pts1, pts2, method=cv2.RANSAC, ransacReprojThreshold=3.0)

    if M is None:
        return {"method": "orb", "success": False, "reason": "transform_estimation_failed"}

    # Extract rotation angle, scale, translation from affine matrix
    # M = [[s*cos(θ), -s*sin(θ), tx],
    #      [s*sin(θ),  s*cos(θ), ty]]
    cos_theta = M[0, 0]
    sin_theta = M[1, 0]
    scale = math.sqrt(cos_theta ** 2 + sin_theta ** 2)
    theta_rad = math.atan2(sin_theta, cos_theta)
    theta_deg = math.degrees(theta_rad)
    tx = M[0, 2]
    ty = M[1, 2]

    h, w = gray1.shape
    inlier_count = int(inliers.sum()) if inliers is not None else 0

    return {
        "method": "orb_affine",
        "success": True,
        "rotation_deg": round(theta_deg, 4),
        "scale_factor": round(scale, 6),
        "translation_px": [round(float(tx), 2), round(float(ty), 2)],
        "translation_normalized": [round(float(tx) / w, 5), round(float(ty) / h, 5)],
        "inlier_count": inlier_count,
        "total_matches": len(good_matches),
        "inlier_ratio": round(inlier_count / len(good_matches), 3) if good_matches else 0,
    }


def estimate_rotation_phase_correlation(img1: np.ndarray, img2: np.ndarray) -> dict:
    """Estimate rotation using phase correlation in polar-log space."""
    gray1 = cv2.cvtColor(img1, cv2.COLOR_BGR2GRAY).astype(np.float64)
    gray2 = cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY).astype(np.float64)

    h, w = gray1.shape
    cx, cy = w // 2, h // 2

    # Compute magnitude spectra
    f1 = np.fft.fft2(gray1)
    f2 = np.fft.fft2(gray2)
    mag1 = np.abs(np.fft.fftshift(f1))
    mag2 = np.abs(np.fft.fftshift(f2))

    # Log-polar transform of magnitude spectra
    max_radius = min(cx, cy)

    flags = cv2.INTER_LINEAR + cv2.WARP_FILL_OUTLIERS + cv2.WARP_POLAR_LOG
    lp1 = cv2.warpPolar(mag1, (360, max_radius), (cx, cy), max_radius, flags)
    lp2 = cv2.warpPolar(mag2, (360, max_radius), (cx, cy), max_radius, flags)

    # Phase correlation on log-polar images → rotation angle
    lp1_64 = lp1.astype(np.float64)
    lp2_64 = lp2.astype(np.float64)

    # Cross-power spectrum
    F1 = np.fft.fft2(lp1_64)
    F2 = np.fft.fft2(lp2_64)
    cross = F1 * np.conj(F2)
    cross_norm = cross / (np.abs(cross) + 1e-10)
    correlation = np.fft.ifft2(cross_norm).real

    # Find peak → rotation angle
    peak = np.unravel_index(np.argmax(correlation), correlation.shape)
    rotation_deg = peak[0]
    if rotation_deg > 180:
        rotation_deg -= 360

    # Confidence: peak sharpness
    peak_value = correlation[peak]
    mean_value = correlation.mean()
    confidence = float(peak_value / (mean_value + 1e-10))

    return {
        "method": "phase_correlation",
        "rotation_deg": round(float(rotation_deg), 2),
        "confidence": round(min(confidence, 100.0), 2),
        "peak_value": round(float(peak_value), 4),
    }


def classify_motion(pair_analyses: list, duration_sec: float) -> dict:
    """Classify overall motion type from pair-wise analyses."""
    if not pair_analyses:
        return {"type": "static", "confidence": 1.0}

    # Aggregate rotation measurements
    rotations = [p["affine"]["rotation_deg"] for p in pair_analyses if p["affine"].get("success")]
    translations = [
        math.sqrt(p["affine"]["translation_normalized"][0] ** 2 + p["affine"]["translation_normalized"][1] ** 2)
        for p in pair_analyses if p["affine"].get("success")
    ]
    scales = [p["affine"]["scale_factor"] for p in pair_analyses if p["affine"].get("success")]
    diffs = [p["diff"]["mean_diff"] for p in pair_analyses]

    result = {
        "is_static": all(d < 0.005 for d in diffs),
        "has_rotation": False,
        "has_translation": False,
        "has_scale_change": False,
    }

    if result["is_static"]:
        return {**result, "type": "static", "confidence": 0.95}

    # Rotation analysis
    if rotations:
        total_rotation = sum(rotations)
        mean_rotation = float(np.mean(rotations))
        rotation_std = float(np.std(rotations))
        is_consistent = rotation_std < abs(mean_rotation) * 0.5 if mean_rotation != 0 else rotation_std < 0.5

        result["rotation"] = {
            "per_frame_deg": [round(r, 4) for r in rotations],
            "total_deg": round(total_rotation, 2),
            "mean_per_pair_deg": round(mean_rotation, 4),
            "std_deg": round(rotation_std, 4),
            "is_consistent": is_consistent,
            "estimated_deg_per_sec": round(total_rotation / duration_sec, 4) if duration_sec > 0 else 0,
            "estimated_total_loop_deg": round(total_rotation, 2),
        }
        result["has_rotation"] = abs(total_rotation) > 1.0

    # Translation analysis
    if translations:
        mean_trans = float(np.mean(translations))
        result["has_translation"] = mean_trans > 0.005
        result["translation"] = {
            "mean_per_pair_normalized": round(mean_trans, 5),
        }

    # Scale analysis
    if scales:
        mean_scale = float(np.mean(scales))
        scale_deviation = abs(mean_scale - 1.0)
        result["has_scale_change"] = scale_deviation > 0.005
        result["scale"] = {
            "mean_factor": round(mean_scale, 6),
            "deviation_from_1": round(scale_deviation, 6),
        }

    # Classify type
    if result["has_rotation"] and not result["has_translation"] and not result["has_scale_change"]:
        motion_type = "continuous_rotate"
    elif result["has_rotation"] and result["has_scale_change"]:
        motion_type = "spiral"
    elif result["has_scale_change"] and not result["has_rotation"]:
        motion_type = "pulse"
    elif result["has_translation"]:
        motion_type = "drift"
    else:
        motion_type = "subtle_drift"

    result["type"] = motion_type
    return result


def main():
    parser = argparse.ArgumentParser(description="Analyze motion between video frames")
    parser.add_argument("frames_dir", help="Directory containing extracted frames")
    args = parser.parse_args()

    frames_dir = Path(args.frames_dir)
    frame_files = sorted(frames_dir.glob("frame_*.png"))
    if not frame_files:
        print(f"No frame_*.png files found in {frames_dir}", file=sys.stderr)
        sys.exit(1)

    # Load meta for duration info
    meta_path = frames_dir / "meta.json"
    duration = 1.0
    if meta_path.exists():
        with open(meta_path) as f:
            meta = json.load(f)
        duration = meta.get("effective_duration_sec", meta.get("duration_sec", 1.0))

    print(f"Analyzing motion across {len(frame_files)} frames (duration={duration:.3f}s)...")

    pair_analyses = []
    for i in range(len(frame_files) - 1):
        img1 = cv2.imread(str(frame_files[i]))
        img2 = cv2.imread(str(frame_files[i + 1]))

        if img1 is None or img2 is None:
            continue

        print(f"  [{i}→{i+1}] {frame_files[i].name} → {frame_files[i+1].name}")

        diff = compute_frame_diff(img1, img2)
        affine = estimate_rotation_affine(img1, img2)
        phase = estimate_rotation_phase_correlation(img1, img2)

        pair_analyses.append({
            "pair": [frame_files[i].name, frame_files[i + 1].name],
            "pair_index": i,
            "diff": diff,
            "affine": affine,
            "phase_correlation": phase,
        })

    # Also compare first and last frame (loop seam)
    if len(frame_files) >= 2:
        img_first = cv2.imread(str(frame_files[0]))
        img_last = cv2.imread(str(frame_files[-1]))
        if img_first is not None and img_last is not None:
            seam_diff = compute_frame_diff(img_first, img_last)
            seam_affine = estimate_rotation_affine(img_first, img_last)
            seam_analysis = {
                "pair": [frame_files[0].name, frame_files[-1].name],
                "diff": seam_diff,
                "affine": seam_affine,
                "note": "first_vs_last_for_loop_analysis",
            }
        else:
            seam_analysis = None
    else:
        seam_analysis = None

    # Classify motion
    classification = classify_motion(pair_analyses, duration)

    output = {
        "motion_classification": classification,
        "pair_analyses": pair_analyses,
        "loop_seam_analysis": seam_analysis,
        "summary": {
            "duration_sec": round(duration, 4),
            "frame_count": len(frame_files),
            "pairs_analyzed": len(pair_analyses),
            "motion_type": classification["type"],
        },
    }

    # Add velocity estimates
    if classification.get("rotation") and duration > 0:
        rot = classification["rotation"]
        output["summary"]["rotation_deg_per_sec"] = rot.get("estimated_deg_per_sec", 0)
        output["summary"]["total_rotation_deg"] = rot.get("estimated_total_loop_deg", 0)

    out_path = frames_dir / "motion.json"
    with open(out_path, "w") as f:
        json.dump(output, f, indent=2)
    print(f"\nResults -> {out_path}")

    print(f"\nMotion type: {classification['type']}")
    if classification.get("rotation"):
        rot = classification["rotation"]
        print(f"  Rotation: {rot.get('estimated_total_loop_deg', 0):.2f}° per loop "
              f"({rot.get('estimated_deg_per_sec', 0):.2f}°/s)")
    if classification.get("has_translation"):
        print(f"  Translation detected")
    if classification.get("has_scale_change"):
        print(f"  Scale change detected: {classification.get('scale', {}).get('mean_factor', 1.0):.4f}x")


if __name__ == "__main__":
    main()