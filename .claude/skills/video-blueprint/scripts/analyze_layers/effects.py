"""Depth-varying properties + visual effect detection.

T6 module: detects depth-varying stroke width, opacity, color gradient,
and global effects (glow, breathing, vignette, chromatic aberration, grain).
"""

import math
import sys
from pathlib import Path

import cv2
import numpy as np

_parent = Path(__file__).resolve().parent.parent
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


# ─── Depth-Varying Properties ────────────────────────────

def detect_depth_varying_stroke(shapes: list) -> dict:
    """Detect if stroke width varies with depth (outermost → innermost)."""
    widths = [s["stroke_width_px"] for s in shapes if s.get("stroke_width_px", 0) > 0]
    if len(widths) < 2:
        return {"varies": False}
    near = widths[0]
    far = widths[-1]
    ratio = abs(near - far) / max(near, 1)
    return {
        "varies": ratio > 0.2,
        "near_width_px": round(near, 1),
        "far_width_px": round(far, 1),
        "variation_ratio": round(ratio, 3),
    }


def detect_depth_varying_opacity(shapes: list) -> dict:
    """Detect if brightness/opacity varies with depth."""
    brightnesses = [s.get("brightness", 0) for s in shapes if "brightness" in s]
    if len(brightnesses) < 2:
        return {"varies": False}
    near = brightnesses[0]
    far = brightnesses[-1]
    ratio = abs(near - far) / max(near, 1)
    return {
        "varies": ratio > 0.15,
        "near_brightness": round(near, 1),
        "far_brightness": round(far, 1),
        "variation_ratio": round(ratio, 3),
    }


def detect_color_gradient(shapes: list) -> dict:
    """Detect if color changes with depth (outermost vs innermost)."""
    if len(shapes) < 2:
        return {"has_gradient": False}
    outer = shapes[0]
    inner = shapes[-1]
    rgb_outer = outer.get("dominant_color_rgb")
    rgb_inner = inner.get("dominant_color_rgb")
    if not rgb_outer or not rgb_inner:
        return {"has_gradient": False}
    lab_outer = rgb_to_lab(*rgb_outer)
    lab_inner = rgb_to_lab(*rgb_inner)
    de = compute_delta_e2000(lab_outer, lab_inner)
    return {
        "has_gradient": de > 3.0,
        "delta_e": round(de, 2),
        "near_rgb": rgb_outer,
        "far_rgb": rgb_inner,
    }


# ─── Global Effects ──────────────────────────────────────

def detect_glow(img_bgr: np.ndarray, mask: np.ndarray) -> dict:
    """Detect glow by measuring intensity falloff around masked edges."""
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY).astype(np.float64)
    edges = cv2.Canny(mask, 50, 150)
    if edges.sum() == 0:
        return {"has_glow": False}

    dist = cv2.distanceTransform(255 - edges, cv2.DIST_L2, 5)
    max_dist = 20
    intensities = []
    for d in range(1, max_dist):
        ring = (dist >= d - 0.5) & (dist < d + 0.5) & (mask == 0)
        if ring.any():
            intensities.append(float(gray[ring].mean()))
        else:
            intensities.append(0)

    if len(intensities) < 5 or intensities[0] < 3:
        return {"has_glow": False}

    # Check for decay pattern: intensity should decrease
    arr = np.array(intensities[:10])
    if arr[0] <= 0:
        return {"has_glow": False}

    # Monotonic decrease check (allow some noise)
    decreasing = sum(1 for i in range(len(arr) - 1) if arr[i] >= arr[i + 1] * 0.8)
    has_glow = decreasing >= len(arr) * 0.5 and arr[0] > 5 and arr[-1] < arr[0] * 0.8

    return {
        "has_glow": has_glow,
        "intensity_at_1px": round(intensities[0], 1),
        "intensity_at_5px": round(intensities[4] if len(intensities) > 4 else 0, 1),
        "decay_ratio": round(intensities[4] / intensities[0], 3) if intensities[0] > 0 and len(intensities) > 4 else 0,
    }


def detect_breathing(shapes_by_frame: dict) -> dict:
    """Detect periodic scale oscillation across frames."""
    if len(shapes_by_frame) < 6:
        return {"has_breathing": False}

    widths = []
    for idx in sorted(shapes_by_frame.keys()):
        shapes = shapes_by_frame[idx]
        if shapes:
            widths.append(shapes[0]["width_px"])

    if len(widths) < 6:
        return {"has_breathing": False}

    arr = np.array(widths)
    mean_w = arr.mean()
    if mean_w == 0:
        return {"has_breathing": False}

    detrended = (arr - mean_w) / mean_w
    amplitude = float((detrended.max() - detrended.min()) / 2)

    has_breathing = 0.005 < amplitude < 0.05

    result = {
        "has_breathing": has_breathing,
        "amplitude_ratio": round(amplitude, 4),
        "mean_width_px": round(float(mean_w), 1),
    }

    # Try to detect period via autocorrelation
    if has_breathing and len(widths) >= 8:
        try:
            from scipy.signal import find_peaks
            autocorr = np.correlate(detrended - detrended.mean(), detrended - detrended.mean(), mode="full")
            autocorr = autocorr[len(autocorr) // 2:]
            if len(autocorr) > 3:
                peaks, _ = find_peaks(autocorr[1:], height=0)
                if len(peaks) > 0:
                    result["period_frames"] = int(peaks[0]) + 1
        except ImportError:
            pass

    return result


def detect_vignette(img_bgr: np.ndarray) -> dict:
    """Detect radial brightness darkening (vignette)."""
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY).astype(np.float64)
    h, w = gray.shape
    max_r = math.sqrt((w / 2) ** 2 + (h / 2) ** 2)

    y, x = np.ogrid[:h, :w]
    radial = np.sqrt((x - w / 2) ** 2 + (y - h / 2) ** 2) / max_r

    bins = 20
    profile = []
    for i in range(bins):
        r_min, r_max = i / bins, (i + 1) / bins
        ring = (radial >= r_min) & (radial < r_max)
        if ring.any():
            profile.append(float(gray[ring].mean()))
        else:
            profile.append(0)

    if len(profile) < 10:
        return {"has_vignette": False}

    center_b = float(np.mean(profile[:5]))
    edge_b = float(np.mean(profile[-5:]))
    darkening = 1 - (edge_b / center_b) if center_b > 0 else 0

    vignette_start = 1.0
    for i in range(len(profile) - 1):
        if profile[i + 1] < profile[i] * 0.92:
            vignette_start = round((i + 1) / bins, 2)
            break

    return {
        "has_vignette": darkening > 0.15,
        "darkening_ratio": round(float(darkening), 3),
        "start_radius": vignette_start,
        "center_brightness": round(center_b, 1),
        "edge_brightness": round(edge_b, 1),
    }


def detect_chromatic_aberration(img_bgr: np.ndarray) -> dict:
    """Detect CA by comparing R/G/B channel edge positions."""
    b, g, r = cv2.split(img_bgr)
    edges_r = cv2.Canny(r, 50, 150)
    edges_g = cv2.Canny(g, 50, 150)
    edges_b = cv2.Canny(b, 50, 150)

    def channel_shift(ch1, ch2):
        if ch1.sum() == 0 or ch2.sum() == 0:
            return (0.0, 0.0)
        try:
            result = cv2.phaseCorrelate(ch1.astype(np.float64), ch2.astype(np.float64))
            return (round(result[0][0], 2), round(result[0][1], 2))
        except Exception:
            return (0.0, 0.0)

    rg = channel_shift(edges_r, edges_g)
    rb = channel_shift(edges_r, edges_b)
    max_shift = max(abs(rg[0]), abs(rg[1]), abs(rb[0]), abs(rb[1]))

    return {
        "has_chromatic_aberration": max_shift > 0.5,
        "rg_shift_px": list(rg),
        "rb_shift_px": list(rb),
        "max_shift_px": round(max_shift, 2),
    }


def detect_grain(img_bgr: np.ndarray) -> dict:
    """Detect noise/grain via high-frequency residual analysis."""
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY).astype(np.float64)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    residual = np.abs(gray - blurred)
    mean_r = float(residual.mean())
    return {
        "has_grain": mean_r > 2.0,
        "mean_residual": round(mean_r, 2),
        "std_residual": round(float(residual.std()), 2),
    }


# ─── Aggregator ──────────────────────────────────────────

def detect_all_effects(img_bgr: np.ndarray, shapes: list, shapes_by_frame: dict) -> dict:
    """Run all effect detectors and return combined result."""
    mask = np.zeros(img_bgr.shape[:2], dtype=np.uint8)
    if shapes:
        # Create a rough mask from shape centroids (simplified)
        h, w = img_bgr.shape[:2]
        for s in shapes:
            cx, cy = int(s["centroid_px"][0]), int(s["centroid_px"][1])
            r = int(max(s.get("width_px", 10), s.get("height_px", 10)) / 4)
            cv2.circle(mask, (cx, cy), r, 255, 2)

    return {
        "stroke_depth": detect_depth_varying_stroke(shapes),
        "opacity_depth": detect_depth_varying_opacity(shapes),
        "color_gradient": detect_color_gradient(shapes),
        "glow": detect_glow(img_bgr, mask),
        "breathing": detect_breathing(shapes_by_frame),
        "vignette": detect_vignette(img_bgr),
        "chromatic_aberration": detect_chromatic_aberration(img_bgr),
        "grain": detect_grain(img_bgr),
        "unknown_effects": [],
    }